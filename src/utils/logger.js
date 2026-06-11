import pino from "pino";

export function createLogger(
  level = process.env.LOG_LEVEL || "info",
  pretty = process.env.LOG_PRETTY === "true",
) {
  return pino({
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: pretty
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  });
}

export const logger = createLogger();
