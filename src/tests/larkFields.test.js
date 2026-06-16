import test from "node:test";
import assert from "node:assert/strict";

import {
  getChangedLarkFieldDetails,
  getChangedLarkFieldNames,
  normalizeLarkFieldValue,
} from "../utils/larkFields.js";

test("Lark values are normalized by schema type", () => {
  assert.equal(
    normalizeLarkFieldValue([{ text: "abc", type: "text" }], 1),
    "abc",
  );
  assert.equal(normalizeLarkFieldValue("100", 2), 100);
  assert.equal(normalizeLarkFieldValue("1700000000000", 5), 1700000000000);
  assert.deepEqual(
    normalizeLarkFieldValue([{ name: "B" }, { name: "A" }], 4),
    ["A", "B"],
  );
});

test("field comparison ignores Last Synced At and rich text shape", () => {
  const changed = getChangedLarkFieldNames({
    desiredFields: {
      "Unique Key": "order:1",
      Amount: 100,
      Categories: ["A", "B"],
      "Last Synced At": 9999,
    },
    existingFields: {
      "Unique Key": [{ text: "order:1", type: "text" }],
      Amount: "100",
      Categories: [{ name: "B" }, { name: "A" }],
      "Last Synced At": 1000,
    },
    fieldSchema: [
      { name: "Unique Key", type: 1 },
      { name: "Amount", type: 2 },
      { name: "Categories", type: 4 },
      { name: "Last Synced At", type: 5 },
    ],
  });

  assert.deepEqual(changed, []);
});

test("field comparison returns normalized before and after values", () => {
  const changed = getChangedLarkFieldDetails({
    desiredFields: {
      Amount: 200,
      Categories: ["B", "A"],
    },
    existingFields: {
      Amount: "100",
      Categories: [{ name: "A" }],
    },
    fieldSchema: [
      { name: "Amount", type: 2 },
      { name: "Categories", type: 4 },
    ],
  });

  assert.deepEqual(changed, [
    {
      field_name: "Amount",
      before: 100,
      after: 200,
    },
    {
      field_name: "Categories",
      before: ["A"],
      after: ["A", "B"],
    },
  ]);
});

test("number comparison ignores tiny floating point noise", () => {
  const changed = getChangedLarkFieldDetails({
    desiredFields: {
      Cost: 132498.9621559417,
      Amount: 132499.1,
    },
    existingFields: {
      Cost: 132498.962155941,
      Amount: 132498.9,
    },
    fieldSchema: [
      { name: "Cost", type: 2 },
      { name: "Amount", type: 2 },
    ],
  });

  assert.deepEqual(changed, [
    {
      field_name: "Amount",
      before: 132498.9,
      after: 132499.1,
    },
  ]);
});
