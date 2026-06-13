import pino from "pino";

const LEVEL_NAMES = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return date.toISOString().replace("T", " ").slice(0, 19);
}

export function formatCompactLog(entry) {
  const prefix = `[${formatTimestamp(entry.time)}] ${LEVEL_NAMES[entry.level] || entry.level}`;
  const context = [];
  if (entry.level >= 40) {
    for (const key of [
      "date",
      "table_name",
      "operation",
      "attempt",
      "delay_ms",
      "error",
      "unidentified_lark_preserved",
    ]) {
      if (entry[key] != null && entry[key] !== "") {
        context.push(`${key}=${entry[key]}`);
      }
    }
  }
  return `${prefix}: ${entry.msg || ""}${context.length ? ` | ${context.join(" ")}` : ""}`;
}

function createCompactStream(destination = process.stdout) {
  return {
    write(line) {
      try {
        destination.write(`${formatCompactLog(JSON.parse(line))}\n`);
      } catch {
        destination.write(line.endsWith("\n") ? line : `${line}\n`);
      }
    },
  };
}

export function createLogger(
  level = process.env.LOG_LEVEL || "info",
  format = process.env.LOG_FORMAT || "compact",
) {
  const options = {
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (format === "compact") {
    return pino(options, createCompactStream());
  }
  if (format === "pretty") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: process.stdout.isTTY,
        singleLine: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    };
  }
  return pino(options);
}

export const logger = createLogger();
