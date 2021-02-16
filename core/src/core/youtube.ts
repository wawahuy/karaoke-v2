import ytdl from "ytdl-core";
import { Readable } from "stream";
import { Option, VideoInfo } from "./models/youtube";
import log, { logError } from "./log";

export default class Youtube {
  constructor(private _videoID: string) {}

  getURL() {
    return "https://www.youtube.com/watch?v=" + this._videoID;
  }

  read(option?: Option): Readable {
    return ytdl(this.getURL(), option);
  }

  async getInfo(): Promise<VideoInfo | null> {
    return ytdl.getInfo(this.getURL()).catch((err) => {
      logError(err);
      return null;
    });
  }
}
