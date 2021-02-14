import CacheService from "./cache";
import Youtube from "../core/youtube";
import { VideoFormat, VideoInfo } from "../core/models/youtube";
import VideoInfoModel from "../models/schema/video_info";
import Moment from "moment";
import fs from "fs";
import log from "../core/log";

export default class YoutubeInfoCacheService extends CacheService {
  private _pathTemporary: string | undefined;
  private _info!: VideoInfo | null;
  private _createdDate: Date | undefined;

  get isExpired() {
    const expiredSecond = Number(
      this._info?.player_response.streamingData.expiresInSeconds
    );
    const expired = new Date().getTime() + Math.round(expiredSecond * 900);
    return new Date().getTime() < expired;
  }

  private constructor(private _videoID: string) {
    super();
  }

  public static async create(
    videoID: string
  ): Promise<YoutubeInfoCacheService | null> {
    const vinfo = new YoutubeInfoCacheService(videoID);
    const isLoaded = (await vinfo.loadTemporary()) || (await vinfo.loadNew());
    if (!isLoaded) {
      return null;
    }
    return vinfo;
  }

  getBestFullFormat(): VideoFormat | undefined {
    return this._info?.formats?.filter((v) => v.hasAudio && v.hasVideo)?.[0];
  }

  async forceLoad() {
    this.removeTemporary();
    return await this.loadNew();
  }

  private async loadTemporary(): Promise<boolean> {
    const videoInfoRows = await VideoInfoModel.findOne({
      where: {
        videoID: this._videoID,
      },
    });

    // check tmp file path
    this._pathTemporary = videoInfoRows?.pathInfo;
    this._createdDate = videoInfoRows?.createdAt;
    if (!this._pathTemporary || !fs.statSync(this._pathTemporary)) {
      return false;
    }

    // load
    const file = fs.readFileSync(this._pathTemporary);
    try {
      this._info = JSON.parse(file.toString("utf-8"));
    } catch (e) {
      this.removeTemporary();
      log(e);
      return false;
    }
    return this.isExpired;
  }

  private async loadNew(): Promise<boolean> {
    const youtube = new Youtube(this._videoID);
    this._info = await youtube.getInfo();
    this._createdDate = new Date();
    log("Load new VideoID: ", this._videoID);

    if (this._info) {
      this.saveInfo();
      return true;
    }
    return false;
  }

  private saveInfo() {
    const path = this.makeTemporaryPath();

    // save on DB
    VideoInfoModel.build({
      videoID: this._videoID,
      pathInfo: path,
    }).save();

    // save on File
    fs.writeFileSync(path, JSON.stringify(this._info));
  }

  private removeTemporary() {
    if (this._pathTemporary && fs.statSync(this._pathTemporary)) {
      fs.unlinkSync(this._pathTemporary);
    }
  }
}
