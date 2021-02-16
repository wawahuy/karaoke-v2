import { Readable } from "stream";
import { VideoFormat } from "../core/models/youtube";
import { VideoSegmentAttribute } from "./schema/video_segment";

export interface YoutubeStreamCacheOption {
  format?: VideoFormat;
  start?: number;
  end?: number;
  videoId?: string;
}

export interface SegmentReadable {
  readable?: Readable;
  newData?: boolean;
  model?: VideoSegmentAttribute;
}
