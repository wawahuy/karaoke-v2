import { Router } from "express";
import playGet from "./play";

const routerMain = Router();
routerMain.get("/v/:video", playGet);

export default routerMain;
