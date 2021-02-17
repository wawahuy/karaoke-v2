import { Readable, Writable } from "stream";
import { VideoFormat } from "../core/models/youtube";
import { VideoSegmentAttribute } from "./schema/video_segment";

export interface YoutubeStreamCacheOption {
  format?: VideoFormat;
  start?: number;
  end?: number;
  videoId?: string;
  cachedSize?: {
    ram?: number;
    diskCluster?: number;
  };
}

export interface SegmentReadable {
  readable?: Readable;
  writeable?: Writable;
  newData?: boolean;
  model?: VideoSegmentAttribute;
}
