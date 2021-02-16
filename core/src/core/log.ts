export function logSql(sql: string) {
  log("[SQL] " + sql?.toString());
}

export function logError(error: any) {
  log("[Error]", error);
}

export function logTimeExecute(...args: any[]) {
  const t = new Date().getTime();
  return () => {
    log(...args, "(" + (new Date().getTime() - t) + " ms)");
  };
}

export default function log(...args: any[]) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}
