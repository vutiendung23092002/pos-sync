import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLarkUniqueIndex,
  dedupeMappedRecords,
} from "../utils/dedupe.js";
import { getLarkTextField } from "../utils/larkFields.js";

test("POS duplicate records keep latest update", () => {
  const records = dedupeMappedRecords([
    {
      uniqueKey: "order:1",
      rawInsertedAt: "2026-03-23T00:00:00Z",
      rawUpdatedAt: "2026-03-23T01:00:00Z",
      fields: { value: "old" },
    },
    {
      uniqueKey: "order:1",
      rawInsertedAt: "2026-03-23T00:00:00Z",
      rawUpdatedAt: "2026-03-23T02:00:00Z",
      fields: { value: "new" },
    },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].fields.value, "new");
});

test("POS duplicates with equal timestamps keep last occurrence", () => {
  const records = dedupeMappedRecords([
    { uniqueKey: "order:1", rawUpdatedAt: null, fields: { value: 1 } },
    { uniqueKey: "order:1", rawUpdatedAt: null, fields: { value: 2 } },
  ]);
  assert.equal(records[0].fields.value, 2);
});

test("Lark duplicate records keep newest created_time", () => {
  const result = buildLarkUniqueIndex(
    [
      {
        record_id: "old",
        created_time: "100",
        fields: { "Unique Key": [{ text: "order:1", type: "text" }] },
      },
      {
        record_id: "new",
        created_time: "200",
        fields: { "Unique Key": "order:1" },
      },
    ],
    "Unique Key",
  );
  assert.equal(result.canonicalMap.get("order:1").record_id, "new");
  assert.deepEqual(result.duplicateRecordIds, ["old"]);
});

test("extract Lark text from rich text array", () => {
  assert.equal(getLarkTextField([{ text: "abc", type: "text" }]), "abc");
});

test("extract Lark text from plain string", () => {
  assert.equal(getLarkTextField("abc"), "abc");
});
