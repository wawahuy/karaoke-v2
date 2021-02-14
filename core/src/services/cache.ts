import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import appConfigs from "../configs/app";

export default class CacheService {
  constructor() {}

  getDataDir() {
    const dir = path.join(appConfigs.dataDir, "/data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    return dir;
  }

  getTemporaryDir() {
    const dir = path.join(appConfigs.dataDir, "/tmp");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    return dir;
  }

  makeTemporaryPath() {
    return path.join(this.getTemporaryDir(), uuid());
  }
}
