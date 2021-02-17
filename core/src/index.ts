import express from "express";
import fs from "fs";
import cors from "cors";
import log from "./core/log";
import testRouter from "./routes/test";
import appConfigs from "./configs/app";
import dbConfigs from "./configs/db";
import corsConfigs from "./configs/cors";
import routerMain from "./routes/main";
import SqliteProvider from "./providers/sqlite";

SqliteProvider.getInstance();

// Logging configs
log("Development:", appConfigs.isDevelopment);
log("PKG:", appConfigs.isOnPKG);
log("Data dir:", appConfigs.dataDir);
log("DB file:", dbConfigs.file);

// Data dir's create
if (!fs.existsSync(appConfigs.dataDir)) {
  fs.mkdirSync(appConfigs.dataDir);
  log("Create dir:", appConfigs.dataDir);
}

// Initing app
const app = express();
app.use(cors(corsConfigs));

if (appConfigs.isDevelopment) {
  app.use("/test", testRouter);
}
app.use("/main", routerMain);

app
  .listen(appConfigs.port, () => {
    log("HTTP started!");
  })
  .on("error", log);
