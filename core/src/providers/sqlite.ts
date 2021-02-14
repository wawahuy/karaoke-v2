import log from "../core/log";
import sqlite from "sqlite3";
import { Sequelize } from "sequelize-typescript";
import dbConfigs from "../configs/db";
import VideoInfoModel from "../models/schema/video_info";

export default class SqliteProvider {
  private static _instance = new SqliteProvider();
  private _db!: Sequelize;

  private constructor() {
    this._db = new Sequelize(dbConfigs.sqlite);
    this.initingModels();
  }

  public static getInstance(): SqliteProvider {
    return SqliteProvider._instance;
  }

  private initingModels() {
    const models = [VideoInfoModel] as any[];

    // Add models
    this._db.addModels(models);

    // Initing table if not exists
    models.map((model) => model.sync());
  }
}
