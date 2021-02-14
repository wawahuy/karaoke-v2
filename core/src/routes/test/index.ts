import { Router } from "express";
import testPlayGet from "./play";
import testViewGet from "./view";

const routerTest = Router();
routerTest.get("/", testViewGet);
routerTest.get("/v/:video", testPlayGet);

export default routerTest;
