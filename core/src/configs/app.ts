import path from "path";

const PKG_TOP_DIR = "snapshot";
const isOnPKG = (function () {
  const pathParsed = path.parse(__dirname);
  const root = pathParsed.root;
  const dir = pathParsed.dir;
  const firstDepth = path.relative(root, dir).split(path.sep)[0];
  return firstDepth === PKG_TOP_DIR;
})();

export default {
  // app run on production & exe
  isOnPKG,

  // data dir
  dataDir: isOnPKG
    ? path.join(path.dirname(process.execPath), "__data__")
    : path.join(__dirname, "../../../__data__"),

  // development
  isDevelopment: process.env.ENV === "dev",

  // port app
  port: process.env.PORT,

  // max cache RAM & disk on one stream data (default: 100MB)
  ramCacheMax: 100 * 1024, // test
  diskCacheClusterMax: 10,
};
