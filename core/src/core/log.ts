function logCommon(...args: any[]) {
  console.log("\x1b[37m", `[${new Date().toISOString()}]`, ...args);
}

export function logSql(sql: string) {
  logCommon("\x1b[36m", "[SQL] " + sql?.toString());
}

export function logError(...error: any[]) {
  logCommon("\x1b[31m", "[Error]", ...error);
}

export function logTimeExecute(...args: any[]) {
  const t = new Date().getTime();
  return (log?: (...args: any[]) => void) => {
    const arrs = [...args, "(" + (new Date().getTime() - t) + " ms)"];
    if (log) {
      log(...arrs);
      return;
    }
    logCommon("\x1b[34m", ...arrs);
  };
}

export function logNote(...args: any[]) {
  logCommon("\x1b[33m", ...args);
}

export default function log(...args: any[]) {
  logCommon("\x1b[37m", ...args);
}
