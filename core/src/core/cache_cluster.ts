import { CacheClusterOption } from "./models/cache_cluster";

export default class CacheCluster {
  constructor(private _option: CacheClusterOption) {}
  push(chunk: any) {}
  read(size: number) {}
}
