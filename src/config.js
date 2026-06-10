import "dotenv/config";

import { resolveDateRange } from "./utils/date.js";

const REQUIRED_ENV = [
  "POS_API_KEY",
  "POS_SHOP_ID",
  "DATABASE_URL",
  "LARK_APP_ID",
  "LARK_APP_SECRET",
];

function parseBoolean(value, name) {
  if (value == null || value === "") return false;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  throw new Error(`${name} must be true or false`);
}

function parsePositiveInteger(value, name, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

export function loadConfig(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const syncLookbackDays = parsePositiveInteger(
    env.SYNC_LOOKBACK_DAYS,
    "SYNC_LOOKBACK_DAYS",
    14,
  );
  const dateRange = resolveDateRange({
    from: env.FROM,
    to: env.TO,
    lookbackDays: syncLookbackDays,
  });

  return {
    pos: {
      apiKey: env.POS_API_KEY,
      shopId: env.POS_SHOP_ID,
    },
    databaseUrl: env.DATABASE_URL,
    lark: {
      appId: env.LARK_APP_ID,
      appSecret: env.LARK_APP_SECRET,
    },
    dateRange,
    dryRun: parseBoolean(env.DRY_RUN, "DRY_RUN"),
    syncLookbackDays,
    logLevel: env.LOG_LEVEL || "info",
  };
}
