import log from "./log";
import { CacheClusterOption } from "./models/cache_cluster";

export default class CacheCluster {
  _data: any[] = [];
  _watcherWriteFn!: ((error?: Error | null) => void) | null | undefined;
  _watcherReadFn!: (((chunk: any) => void) | null) | undefined;
  _watcherReadSize!: number | null;

  get isFull() {
    return this._data.length > 10;
  }

  get isEmpty() {
    return false;
  }

  constructor(private _option: CacheClusterOption) {}

  push(chunk: any, cb?: (error?: Error | null) => void) {
    this._data.push(chunk);
    this._watcherWriteFn = cb;
  }

  readOnceWatcher(size: number) {
    this._watcherReadSize = size;
    return (runable: (chunk: any) => void) => {
      this._watcherReadFn = runable;
    };
  }


}
