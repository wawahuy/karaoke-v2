import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";

export default async function testPlayGet(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/html");
  res.end(fs.readFileSync(path.join(__dirname, "view.html")));
}
