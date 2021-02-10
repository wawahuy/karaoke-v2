import ytdl from "ytdl-core";
import { Readable } from "stream";
import { Option } from "./models/youtube";
import log from "./log";

export default class Youtube {
  constructor(private _videoID: string) {}

  getURL() {
    return "https://www.youtube.com/watch?v=" + this._videoID;
  }

  read(option?: Option): Readable {
    return ytdl(this.getURL(), option);
  }

  async getInfo(): Promise<ytdl.videoInfo | null> {
    return ytdl.getInfo(this.getURL()).catch((err) => {
      log(err);
      return null;
    });
  }
}
