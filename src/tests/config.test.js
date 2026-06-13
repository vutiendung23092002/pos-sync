import test from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../config.js";

const baseEnv = {
  POS_API_KEY: "pos-key",
  POS_SHOP_ID: "shop-id",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/postgres",
  LARK_APP_ID: "app-id",
  LARK_APP_SECRET: "app-secret",
  FROM: "2026-03-01",
  TO: "2026-03-01",
};

test("production environment uses production table types by default", () => {
  const config = loadConfig(baseEnv);
  assert.equal(config.syncEnvironment, "production");
  assert.equal(config.syncMode, "backfill");
  assert.equal(config.advisoryLockId, 987654322);
  assert.equal(config.tableConfigSource, "mapping");
  assert.equal(config.databaseSslRejectUnauthorized, true);
  assert.equal(config.logFormat, "compact");
  assert.deepEqual(config.tableTypes, {
    td: {
      order: "facebook_order_td",
      item: "facebook_order_item_td",
    },
    cd: {
      order: "facebook_order_cd",
      item: "facebook_order_item_cd",
    },
  });
});

test("log format supports pretty and json", () => {
  assert.equal(loadConfig({ ...baseEnv, LOG_FORMAT: "pretty" }).logFormat, "pretty");
  assert.equal(loadConfig({ ...baseEnv, LOG_FORMAT: "json" }).logFormat, "json");
});

test("legacy LOG_PRETTY remains supported", () => {
  assert.equal(loadConfig({ ...baseEnv, LOG_PRETTY: "true" }).logFormat, "pretty");
});

test("invalid log format throws", () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, LOG_FORMAT: "verbose" }),
    /LOG_FORMAT must be compact, pretty, or json/,
  );
});

test("database certificate verification can be explicitly disabled", () => {
  const config = loadConfig({
    ...baseEnv,
    DATABASE_SSL_REJECT_UNAUTHORIZED: "false",
  });
  assert.equal(config.databaseSslRejectUnauthorized, false);
});

test("test environment only uses test table types", () => {
  const config = loadConfig({ ...baseEnv, SYNC_ENV: "test" });
  assert.equal(config.syncEnvironment, "test");
  assert.deepEqual(config.tableTypes, {
    td: {
      order: "facebook_order_td_test",
      item: "facebook_order_item_td_test",
    },
    cd: {
      order: "facebook_order_cd_test",
      item: "facebook_order_item_cd_test",
    },
  });
});

test("invalid sync environment throws", () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, SYNC_ENV: "staging" }),
    /SYNC_ENV must be production or test/,
  );
});

test("database table config source can be selected", () => {
  const config = loadConfig({
    ...baseEnv,
    TABLE_CONFIG_SOURCE: "database",
  });
  assert.equal(config.tableConfigSource, "database");
});

test("invalid table config source throws", () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, TABLE_CONFIG_SOURCE: "file" }),
    /TABLE_CONFIG_SOURCE must be mapping or database/,
  );
});

test("today mode uses a separate advisory lock", () => {
  const config = loadConfig({
    ...baseEnv,
    SYNC_MODE: "today",
  });
  assert.equal(config.syncMode, "today");
  assert.equal(config.advisoryLockId, 987654323);
});

test("invalid sync mode throws", () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, SYNC_MODE: "realtime" }),
    /SYNC_MODE must be backfill or today/,
  );
});
