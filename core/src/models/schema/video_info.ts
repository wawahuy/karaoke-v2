import { Model, Table, Column, PrimaryKey } from "sequelize-typescript";

export interface VideoInfoAttribute {
  videoID?: string;
  pathInfo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  timestamps: true,
})
export default class VideoInfoModel extends Model<VideoInfoAttribute> {
  @PrimaryKey
  @Column
  videoID!: string;

  @Column
  pathInfo!: string;
}
