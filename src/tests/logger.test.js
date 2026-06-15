import test from "node:test";
import assert from "node:assert/strict";

import { formatCompactLog } from "../utils/logger.js";

test("compact log keeps an info event on one concise line", () => {
  const output = formatCompactLog({
    level: 30,
    time: "2026-06-13T03:00:00.000Z",
    msg: "Day 1/30 | 2026-03-01 | POS 100 | C 2 U 3 same 95 D 0 dup 0 | 4.2s",
    hidden_detail: "not rendered",
  });

  assert.equal(
    output,
    "[2026-06-13 03:00:00] INFO: Day 1/30 | 2026-03-01 | POS 100 | C 2 U 3 same 95 D 0 dup 0 | 4.2s",
  );
});

test("compact warning includes actionable context", () => {
  const output = formatCompactLog({
    level: 40,
    time: "2026-06-13T03:00:00.000Z",
    msg: "Retrying request",
    operation: "POS orders",
    attempt: 2,
    delay_ms: 2000,
  });

  assert.match(output, /operation=POS orders/);
  assert.match(output, /attempt=2/);
  assert.match(output, /delay_ms=2000/);
});

test("compact table plan includes destination context and readable counters", () => {
  const output = formatCompactLog({
    level: 30,
    time: "2026-06-15T02:19:43.000Z",
    step: "table_plan",
    date: "2026-06-01",
    period_type: "TD",
    record_type: "ORDER",
    months: [6],
    table_id: "tblJune",
    pos_records: 532,
    lark_day_records: 533,
    create: 0,
    update: 44,
    unchanged: 488,
    delete: 0,
    duplicates_delete: 0,
  });

  assert.equal(
    output,
    "[2026-06-15 02:19:43] INFO: PLAN | 2026-06-01 | TD ORDER | month=6 | table=tblJune | POS=532 | Lark=533 | create=0 | update=44 | unchanged=488 | delete=0 | duplicates=0",
  );
});

test("compact day summary uses readable action names", () => {
  const output = formatCompactLog({
    level: 30,
    time: "2026-06-15T02:21:15.000Z",
    step: "day_complete",
    day_progress: "1/2",
    date: "2026-06-01",
    pos_orders: 535,
    create: 0,
    update: 126,
    unchanged: 2010,
    delete: 0,
    duplicates_deleted: 0,
    elapsed_ms: 152200,
  });

  assert.equal(
    output,
    "[2026-06-15 02:21:15] INFO: DAY 1/2 | 2026-06-01 | POS orders=535 | create=0 | update=126 | unchanged=2010 | delete=0 | duplicates=0 | 152.2s",
  );
});
