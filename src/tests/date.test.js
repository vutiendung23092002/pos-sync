import test from "node:test";
import assert from "node:assert/strict";

import {
  enumerateDates,
  getVietnamDayUnixRange,
  resolveDateRange,
} from "../utils/date.js";

test("Vietnam day range uses explicit UTC+7 boundaries", () => {
  const range = getVietnamDayUnixRange("2026-03-23");
  assert.equal(new Date(range.fromMs).toISOString(), "2026-03-22T17:00:00.000Z");
  assert.equal(new Date(range.toMs).toISOString(), "2026-03-23T16:59:59.000Z");
  assert.equal(range.fromTs, Math.floor(range.fromMs / 1000));
  assert.equal(range.toTs, Math.floor(range.toMs / 1000));
});

test("FROM after TO throws", () => {
  assert.throws(
    () => resolveDateRange({ from: "2026-03-24", to: "2026-03-23" }),
    /must not be after/,
  );
});

test("cross-month range is inclusive", () => {
  assert.deepEqual(enumerateDates("2026-03-30", "2026-04-02"), [
    "2026-03-30",
    "2026-03-31",
    "2026-04-01",
    "2026-04-02",
  ]);
});
