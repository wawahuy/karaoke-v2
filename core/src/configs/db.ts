import path from "path";
import { Options } from "sequelize";
import { logSql } from "../core/log";
import appConfigs from "./app";

const file = path.join(appConfigs.dataDir, "save.db");

export default {
  // Path db file
  file,

  // Config DB
  sqlite: {
    username: "root",
    password: "root",
    storage: file,
    host: "localhost",
    dialect: "sqlite",
    logging: logSql,
  } as Options,
};
