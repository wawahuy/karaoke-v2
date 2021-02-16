import express, { Request, Response } from "express";
import ytdl from "ytdl-core";
import Youtube from "../../core/youtube";
import log, { logError } from "../../core/log";
import YoutubeInfoCacheService from "../../services/youtube_info_cache";
import YoutubeStreamCacheService from "../../services/youtube_stream_cache";
import { YoutubeStreamCacheOption } from "../../models/youtube_stream_cache";

export default async function testPlayGet(req: Request, res: Response) {
  const videoId = req.params.video;

  // info video
  const youtubeInfoSevice = await YoutubeInfoCacheService.create(videoId);
  if (!youtubeInfoSevice?.isExpired) {
    res.status(404).send("video info expired or not exists!");
    return;
  }

  // get video format
  const format = youtubeInfoSevice.getBestFullFormat();
  if (!format) {
    res.status(404).send("format not found!");
    return;
  }

  // parse range
  const range = req.headers.range;
  const videoSize = Number(format.contentLength) || 0;
  const patternRange = /bytes=(?<start>[\d]*)-(?<end>[\d]*)/g;
  const matchRange = patternRange.exec(range || "");
  const start = Number(matchRange?.groups?.start) || 0;
  const end = Number(matchRange?.groups?.end) || videoSize - 1;

  log("position: ", start, end, videoSize);
  if (start >= end || start >= videoSize || end > videoSize) {
    res.status(404).send("range failed!");
    return;
  }

  // init stream data
  const option: YoutubeStreamCacheOption = {
    format,
    start,
    end,
    videoId,
  };
  const youtubeStreamCacheService = await YoutubeStreamCacheService.create(
    option
  );
  if (!youtubeStreamCacheService) {
    res.status(404).send("stream cache failed!");
    return;
  }

  // create headers
  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  // HTTP Status 206 for Partial Content
  res.writeHead(206, headers);

  // stream
  youtubeStreamCacheService.pipe(res);
  youtubeStreamCacheService.on("error", (e) => {
    logError(e);
  });
}
