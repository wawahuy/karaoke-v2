import Youtube from "./core/youtube";
import express from "express";
import { Option } from "core/models/youtube";

const app = express();

app.get("/v/:video", async (req, res) => {
  const youtube = new Youtube(req.params.video);
  const info = await youtube.getInfo();
  if (!info?.formats?.length) {
    res.status(404).send("Video not found!");
    return;
  }

  // get video stats
  const format = info.formats[0];
  const videoSize = Number(format.contentLength) || 0;

  // Parse Range
  const range = req.headers.range;
  const patternRange = /bytes=(?<start>[\d]*)-(?<end>[\d]*)/g;
  const matchRange = patternRange.exec(range || "");
  const start = Number(matchRange?.groups?.start) || 0;
  const end = Number(matchRange?.groups?.end) || videoSize - 1;
  console.log("Media position: ", start, end);

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
  youtube
    .read(options)
    .pipe(res)
    .on("close", () => {
      console.log("Pipe close");
    })
    .on("error", (error) => {
      console.log("Pipe stream error:", error);
    });
});

app.listen(1112);
