import { Duplex, Readable, Writable } from "stream";
import path from "path";
import fs, { write } from "fs";
import * as _ from "lodash";
import { v4 as uuid } from "uuid";
import CacheService from "./cache";
import { Option, VideoFormat, VideoInfo } from "../core/models/youtube";
import {
  SegmentReadable,
  YoutubeStreamCacheOption,
} from "../models/youtube_stream_cache";
import appConfigs from "../configs/app";
import Youtube from "../core/youtube";
import log, { logError, logTimeExecute } from "../core/log";
import Locker from "../core/lock";
import VideoSegmentModel, {
  VideoSegmentAttribute,
} from "../models/schema/video_segment";
import CacheCluster from "../core/cache_cluster";

export default class YoutubeStreamCacheService extends Readable {
  private static locker: Locker = new Locker();
  private _cacheSerivice: CacheService;
  private _cacheCluster: CacheCluster;
  private _segments: SegmentReadable[];
  private _segmentPosition = -1;
  private _segmentCurrent: SegmentReadable | null;

  private get maxRamSize() {
    return this._option.cachedSize?.ram || appConfigs.ramCacheMax;
  }

  private get maxDiskClusterSize() {
    return (
      this._option.cachedSize?.diskCluster || appConfigs.diskCacheClusterMax
    );
  }

  private constructor(private _option: YoutubeStreamCacheOption) {
    super();
    this._segments = [];
    this._segmentCurrent = null;
    this._cacheSerivice = new CacheService();
    this._cacheCluster = new CacheCluster({
      ramSize: this.maxRamSize,
      diskClusterSize: this.maxDiskClusterSize,
      path: this._cacheSerivice.getTemporaryDir(),
    });
  }

  public static async create(option: YoutubeStreamCacheOption) {
    const ysc = new YoutubeStreamCacheService(option);
    const locker = YoutubeStreamCacheService.locker;
    const logExec = logTimeExecute("Initing stream cached serivce");
    try {
      await locker.acquire();
      return (await ysc.init()) && ysc;
    } catch (e) {
      logError(e);
    } finally {
      locker.release();
      logExec();
    }
    return null;
  }

  private async init(): Promise<boolean> {
    if (!this._option?.videoId) {
      return false;
    }

    // get info video
    const segmentsModel = await VideoSegmentModel.findAll({
      where: {
        videoID: this._option.videoId,
        iTag: this._option.format?.itag,
      },
    });
    const segmentsAttr = _.map(segmentsModel, "dataValues");

    // build readable stream
    const readables = await this.buildReadableSegment(segmentsAttr);
    if (!readables?.length) {
      return false;
    }
    this._segments = readables;
    log("Create streams: ", readables.length);

    // stream
    this.nextSegment();
    return true;
  }

  private async buildReadableSegment(
    segments: VideoSegmentAttribute[]
  ): Promise<SegmentReadable[] | null> {
    let results: SegmentReadable[] = [];
    if (!this._option.videoId) {
      return null;
    }

    // sort segments
    segments = segments.sort((a, b) => (b.start || 0) - (a.end || 0));

    // fill range segments
    // ex: 20-30, 50-70
    // rs: 0-19, 20-30, 31-49, 50-70, ...
    const byteSize = Number(this._option.format?.contentLength) || 0;
    let segmentsFull: VideoSegmentAttribute[] = [];
    let bytePos = (segments?.[0]?.start || 0) - 1;

    // build 0 -> bytePos
    if (bytePos > 0) {
      segmentsFull.push({
        start: 0,
        end: bytePos - 1,
      });
    }

    // build segments 1 -> n-1 || n
    // start bytePos -> neasted end
    for (let segment of segments) {
      const st = segment.start || 0;
      if (st - bytePos > 1) {
        segmentsFull.push({
          start: bytePos + 1,
          end: st - 1,
        });
      }
      segmentsFull.push(segment);
      bytePos = segment.end || -1;
    }

    // build lasted segment
    if (byteSize - bytePos > 1) {
      segmentsFull.push({
        start: bytePos + 1,
        end: byteSize - 1,
      });
    }

    // cut segment with offset range of player
    const offsetStart = this._option.start || 0;
    const offsetEnd = this._option.end || 0;
    segmentsFull = segmentsFull.filter((segment) => {
      const start = segment.start || 0;
      const end = segment.end || 0;
      return (
        _.inRange(offsetStart, start, end) || _.inRange(offsetEnd, start, end)
      );
    });

    // fill stream data
    for (const segment of segmentsFull) {
      const segmentReadable: SegmentReadable = {
        model: _.cloneDeep(segment),
      };
      const start = segment.start || 0;
      const end = segment.end || 0;
      let offset = 0;

      // make offset
      if (offsetStart > start) {
        offset = offsetStart - start;
        log("Make stream has offset", offset);
      }

      // get stream
      let err: boolean = false;
      if (
        !segment.pathInfo ||
        segment.anotherSaving ||
        !(err = this.checkErrorFileSegment(segment))
      ) {
        // remove on DB
        if (err) {
          logError("File cached failed", segment.pathInfo);
          await this.removeDBSegment(segment);
        }

        // create write file
        // if dif another saving and no file cached
        if (segmentReadable.model && !segment.anotherSaving) {
          const filePath = this.generationPathFile(segment);
          segmentReadable.model.pathInfo = filePath;
          segmentReadable.newData = true;
          segmentReadable.writeable = fs.createWriteStream(filePath);
          // saving on db
          await this.setSavingOnDBSegment(segment, true);
        } else {
          segmentReadable.newData = false;
        }

        segmentReadable.readable = this.createYoutubeStream(
          start + offset,
          end
        );
      } else {
        segmentReadable.newData = false;
        segmentReadable.readable = fs.createReadStream(segment.pathInfo, {
          start: offset,
        });
      }

      // check readable
      if (!segmentReadable.readable) {
        return null;
      }
      results.push(segmentReadable);

      log(
        "Make stream id:",
        this._option.videoId,
        start,
        end,
        segmentReadable.newData
      );
    }

    return results;
  }

  private createYoutubeStream(start: number, end: number) {
    if (!this._option.videoId) {
      return undefined;
    }

    const youtube = new Youtube(this._option.videoId);
    const options: Option = {
      format: this._option.format,
      highWaterMark: 1024 * 1024,
      range: {
        start,
        end,
      },
    };

    return youtube.read(options);
  }

  private checkErrorFileSegment(info: VideoSegmentAttribute) {
    const size = (info.end || 0) - (info.start || 0);
    if (info.pathInfo && fs.existsSync(info.pathInfo)) {
      const stats = fs.statSync(info.pathInfo);
      if (stats.isFile && stats.size === size) {
        return false;
      }
    }
    return true;
  }

  private generationPathFile(info: VideoSegmentAttribute) {
    const dir = path.join(this.getFileDir(), info.videoID || "_");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    return path.join(dir, uuid());
  }

  private getFileDir() {
    const p = path.join(this._cacheSerivice.getDataDir(), "/segment");
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p);
    }
    return p;
  }

  private async setSavingOnDBSegment(
    segment: VideoSegmentAttribute,
    saving: boolean = true
  ) {
    // // create & find segment
    // const models = await VideoSegmentModel.findOrCreate({
    //   where: {
    //     videoID: this._option.videoId,
    //     iTag: this._option.format?.itag,
    //     start: segment.start,
    //     end: segment.end,
    //   },
    // });
    // if (!models.length) {
    //   return false;
    // }

    // // set saving and path info
    // const model = models[0];
    // if (segment.pathInfo) {
    //   model.pathInfo = segment.pathInfo;
    // }
    // model.anotherSaving = saving;
    // await model.save();
    return true;
  }

  private async removeDBSegment(segment: VideoSegmentAttribute) {
    if (segment.pathInfo && fs.existsSync(segment.pathInfo)) {
      fs.unlinkSync(segment.pathInfo);
    }

    await VideoSegmentModel.destroy({
      where: {
        videoID: this._option.videoId,
        iTag: this._option.format?.itag,
        start: segment.start,
        end: segment.end,
      },
      force: true,
    });
  }

  private nextSegment(): boolean {
    this._segmentPosition++;
    if (this._segmentPosition > this._segments.length) {
      return false;
    }

    this._segmentCurrent = this._segments[this._segmentPosition];
    if (!this._segmentCurrent?.readable) {
      return false;
    }

    // generation writeable
    const writeable = new Writable();
    writeable._write = this._write.bind(this);

    // readable
    const readable = this._segmentCurrent.readable;
    readable.pipe(writeable);
    readable.once("end", this.readDataEnd.bind(this));
    readable.once("error", this.readDataError.bind(this));

    log(
      "Next stream",
      this._option.videoId,
      this._segmentCurrent.model?.start,
      this._segmentCurrent.model?.end
    );
    return true;
  }

  async _read(size: number) {
    this._cacheCluster.readOnceWatcher(size)((chunk) => {
      this.push(chunk);
    });
  }

  private _write(
    chunk: any,
    encoding: BufferEncoding,
    next: (error?: Error | null) => void
  ) {
    this._cacheCluster.push(chunk, next);
  }

  private readDataEnd() {
    log("end");
  }

  private readDataError(err: Error) {
    logError(err);
  }
}
