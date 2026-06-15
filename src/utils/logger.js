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

function formatTablePlan(entry) {
  const scope = [entry.period_type, entry.record_type]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase())
    .join(" ");
  const months = Array.isArray(entry.months)
    ? entry.months.join(",")
    : entry.months;

  return [
    "PLAN",
    entry.date,
    scope || entry.table_name,
    months ? `month=${months}` : null,
    entry.table_id ? `table=${entry.table_id}` : null,
    `POS=${entry.pos_records ?? 0}`,
    `Lark=${entry.lark_day_records ?? 0}`,
    `create=${entry.create ?? 0}`,
    `update=${entry.update ?? 0}`,
    `unchanged=${entry.unchanged ?? 0}`,
    `delete=${entry.delete ?? 0}`,
    `duplicates=${entry.duplicates_delete ?? 0}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatDayComplete(entry) {
  return [
    `DAY ${entry.day_progress}`,
    entry.date,
    `POS orders=${entry.pos_orders ?? 0}`,
    `create=${entry.create ?? 0}`,
    `update=${entry.update ?? 0}`,
    `unchanged=${entry.unchanged ?? 0}`,
    `delete=${entry.delete ?? 0}`,
    `duplicates=${entry.duplicates_deleted ?? 0}`,
    `${((entry.elapsed_ms ?? 0) / 1000).toFixed(1)}s`,
  ].join(" | ");
}

export function formatCompactLog(entry) {
  const prefix = `[${formatTimestamp(entry.time)}] ${LEVEL_NAMES[entry.level] || entry.level}`;
  if (entry.step === "table_plan") {
    return `${prefix}: ${formatTablePlan(entry)}`;
  }
  if (entry.step === "day_complete") {
    return `${prefix}: ${formatDayComplete(entry)}`;
  }

  const context = [];
  if (entry.level >= 40) {
    for (const key of [
      "date",
      "period_type",
      "record_type",
      "table_name",
      "table_id",
      "months",
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
