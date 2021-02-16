import { Model, Table, Column, PrimaryKey, Index } from "sequelize-typescript";

export interface VideoSegmentAttribute {
  videoID?: string;
  iTag?: number;
  start?: number;
  end?: number;
  pathInfo?: string;
}

@Table({
  timestamps: true,
  indexes: [
    {
      fields: ["videoID", "iTag"],
      using: "BTREE",
    },
    {
      fields: ["videoID"],
      using: "BTREE",
    },
  ],
})
export default class VideoSegmentModel extends Model<VideoSegmentAttribute> {
  @PrimaryKey
  @Column
  videoID!: string;

  @PrimaryKey
  @Column
  iTag!: number;

  @PrimaryKey
  @Column
  start!: number;

  @PrimaryKey
  @Column
  end!: number;

  @Column
  pathInfo!: string;
}
