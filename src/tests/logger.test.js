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
