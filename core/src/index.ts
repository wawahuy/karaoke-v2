import express from "express";
import testRouter from "./routes/test";

const app = express();

if (process.env.ENV === "dev") {
  app.use("/test", testRouter);
}

app.listen(1112);
