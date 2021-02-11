import { Router } from "express";
import testPlayGet from "./play";
import testPlayCacheGet from "./play_cache";
import testViewGet from "./view";

const routerTest = Router();
routerTest.get("/", testViewGet);
routerTest.get("/v/:video", testPlayGet);
routerTest.get("/v-cache/:video", testPlayCacheGet);

export default routerTest;
