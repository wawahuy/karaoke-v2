import express, { Request, Response } from "express";
import ytdl from "ytdl-core";
import Youtube from "../../core/youtube";
import YoutubeInfoCacheService from "../../services/youtube_info_cache";
import { Option } from "core/models/youtube";
import log from "../../core/log";

export default async function testPlayGet(req: Request, res: Response) {
  const youtube = new Youtube(req.params.video);
  const youtubeInfoSevice = await YoutubeInfoCacheService.create(
    req.params.video
  );

  // check expired
  if (!youtubeInfoSevice?.isExpired) {
    res.status(404).send("Expired!");
    return;
  }

  // get video stats
  const format = youtubeInfoSevice?.getBestFullFormat();
  if (!format) {
    res.status(404).send("Format not found!");
    return;
  }
  const videoSize = Number(format.contentLength) || 0;

  // Parse Range
  const range = req.headers.range;
  const patternRange = /bytes=(?<start>[\d]*)-(?<end>[\d]*)/g;
  const matchRange = patternRange.exec(range || "");
  const start = Number(matchRange?.groups?.start) || 0;
  const end = Number(matchRange?.groups?.end) || videoSize - 1;
  log("Media position: ", start, end);

  // Create headers & option
  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };
  const options: Option = {
    range: {
      start,
      end,
    },
    format,
  };

  // HTTP Status 206 for Partial Content
  res.writeHead(206, headers);

  // Stream the video chunk to the client
  const ytr = youtube.read(options);

  ytr
    .on("end", () => {
      log("yt end");
    })
    .on("error", (error) => {
      log("yt stream error:", error);
    })
    .on("destroy", () => {
      log("yt destroy");
    })
    .on("close", () => {
      log("yt close");
    })
    .pipe(res);

  res
    .on("close", () => {
      log("res pipe close");
    })
    .on("finish", () => {
      log("res pipe finish");
    })
    .on("error", (error) => {
      log("res pipe stream error:", error);
    });
}
