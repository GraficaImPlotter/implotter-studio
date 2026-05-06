/**
 * Simple structured logger for the backend.
 * In production, consider swapping to Winston or Pino.
 */

const isProd = process.env.NODE_ENV === "production";

function format(level, msg, meta = {}) {
  const entry = {
    level,
    message: msg,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(msg, meta) {
    if (isProd) console.log(format("info", msg, meta));
    else console.log(`ℹ️  ${msg}`, meta || "");
  },
  warn(msg, meta) {
    if (isProd) console.warn(format("warn", msg, meta));
    else console.warn(`⚠️  ${msg}`, meta || "");
  },
  error(msg, meta) {
    if (isProd) console.error(format("error", msg, meta));
    else console.error(`❌ ${msg}`, meta || "");
  },
};
