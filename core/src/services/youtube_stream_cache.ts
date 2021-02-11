import { Option } from "core/models/youtube";
import path from "path";
import fs from "fs";
import DBCache from "./db_cache";

export default class YoutubeStreamCacheService extends DBCache {
  constructor(private _option: Option) {
    super();
  }

  getDataDir() {
    const p = path.join(super.getDataDir(), "/bold");
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p);
    }
    return p;
  }
}
