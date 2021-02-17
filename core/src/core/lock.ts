import { logNote, logTimeExecute } from "./log";
import { LockNode } from "./models/locker";

export default class Locker {
  private _locked: boolean;
  private _stack: LockNode[];

  constructor(private _name?: string) {
    this._locked = false;
    this._stack = [];
  }

  acquire() {
    return new Promise((resvole) => {
      const log = `[Locker] ${this._name || "-"} (pos: ${this._stack.length})`;

      if (!this._locked) {
        this._locked = true;
        logNote(log, "no wait!");
        return resvole(null);
      }

      logNote(log, "waitting ...");
      this._stack.push({
        logTime: logTimeExecute(log, "start!, wait"),
        resvole,
      });
    });
  }

  release() {
    let task = this._stack.shift();
    if (task) {
      task.logTime?.(logNote);
      return task.resvole(null);
    }
    this._locked = false;
  }
}
