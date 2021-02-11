import { Option } from "core/models/youtube";
import path from "path";
import fs from "fs";

export default class DBCache {
  constructor() {}

  getDataDir() {
    const p = path.join(__dirname, "../../../__data__");
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p);
    }
    return p;
  }
}
