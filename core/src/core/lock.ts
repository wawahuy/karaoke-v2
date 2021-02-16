export default class Locker {
  private _locked: boolean;
  private _stack: any[];

  constructor() {
    this._locked = false;
    this._stack = [];
  }

  acquire() {
    return new Promise((resvole) => {
      if (!this._locked) {
        this._locked = true;
        return resvole(null);
      }
      this._stack.push(resvole);
    });
  }

  release() {
    let task = this._stack.shift();
    if (task) {
      return task();
    }
    this._locked = false;
  }
}
