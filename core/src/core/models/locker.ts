export interface LockNode {
  logTime?: (log: (args?: any[]) => void) => void;
  resvole: (value: unknown) => void;
}
