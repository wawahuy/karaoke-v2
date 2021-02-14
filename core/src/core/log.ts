export function logSql(sql: string) {
  log("[SQL] " + sql?.toString());
}

export default function log(...args: any[]) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}
