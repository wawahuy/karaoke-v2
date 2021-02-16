import { Duplex, Readable } from "stream";
import path from "path";
import fs from "fs";
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
import * as _ from "lodash";

export default class YoutubeStreamCacheService extends Readable {
  private static locker: Locker = new Locker();
  private _cacheSerivice: CacheService;
  private _segments: SegmentReadable[];

  private constructor(private _option: YoutubeStreamCacheOption) {
    super();
    this._cacheSerivice = new CacheService();
    this._segments = [];
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
    const segmentsAttr = _.map(segmentsModel, "_attributes");

    // build readable stream
    const readables = this.buildReadableSegment(segmentsAttr);
    if (!readables?.length) {
      return false;
    }
    this._segments = readables;
    log("Create streams: ", readables.length);

    return true;
  }

  private buildReadableSegment(
    segments: VideoSegmentAttribute[]
  ): SegmentReadable[] | null {
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
    const segmentsFull: VideoSegmentAttribute[] = [];
    let bytePos = (segments?.[0]?.start || 0) - 1;

    // build 0 -> bytePos
    if (_.isNumber(bytePos) && bytePos > 0) {
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

    // fill stream data
    for (let segment of segmentsFull) {
      let newData: boolean;
      let readable: Readable | null;

      if (!!segment.pathInfo) {
        if (fs.statSync(segment.pathInfo)) {
          newData = false;
          readable = fs.createReadStream(segment.pathInfo);
        } else {
          newData = true;
          readable = this.createYoutubeStream(
            segment.start || 0,
            segment.end || 0
          );
          // remvoe trigger file on DB
        }
      } else {
        newData = true;
        readable = this.createYoutubeStream(
          segment.start || 0,
          segment.end || 0
        );
      }

      if (!readable) {
        return null;
      }

      results.push({
        newData,
        readable,
        model: segment,
      });
    }

    return results;
  }

  private createYoutubeStream(start: number, end: number) {
    if (!this._option.videoId) {
      return null;
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

  private getFileDir() {
    const p = path.join(this._cacheSerivice.getDataDir(), "/file");
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p);
    }
    return p;
  }

  private getMaxSizeCache() {
    return 1024 * 1024 || appConfigs.ramCacheMax;
  }

  async _read(size: number) {}

  private _write(
    chunk: any,
    encoding: BufferEncoding,
    next: (error?: Error | null) => void
  ) {}
}
