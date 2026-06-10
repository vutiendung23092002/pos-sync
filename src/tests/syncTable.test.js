import test from "node:test";
import assert from "node:assert/strict";

import { syncTable } from "../services/syncTable.js";

function createLarkClient(existingRecords) {
  const calls = { create: [], update: [], delete: [] };
  return {
    calls,
    async searchRecords() {
      return existingRecords;
    },
    async batchCreateRecords(args) {
      calls.create.push(args);
    },
    async batchUpdateRecords(args) {
      calls.update.push(args);
    },
    async batchDeleteRecords(args) {
      calls.delete.push(args);
    },
  };
}

const common = {
  tableName: "orders",
  token: "token",
  tableConfig: { base_id: "base", table_id: "table" },
  dateFieldName: "Ngày tạo đơn",
  dateRange: { fromMs: 1, toMs: 2 },
  uniqueFieldName: "Unique Key",
};

test("dry run plans changes without writes", async () => {
  const client = createLarkClient([
    {
      record_id: "existing",
      created_time: "100",
      fields: { "Unique Key": "order:1" },
    },
  ]);
  const summary = await syncTable({
    ...common,
    larkClient: client,
    mappedRecords: [
      {
        uniqueKey: "order:1",
        fields: { "Unique Key": "order:1", "Trạng thái": "Đã xác nhận" },
      },
      {
        uniqueKey: "order:2",
        fields: { "Unique Key": "order:2", "Trạng thái": "Đã xác nhận" },
      },
    ],
    dryRun: true,
    posFetchComplete: true,
  });
  assert.deepEqual(
    { create: summary.createCount, update: summary.updateCount, delete: summary.deleteCount },
    { create: 1, update: 1, delete: 0 },
  );
  assert.deepEqual(client.calls, { create: [], update: [], delete: [] });
});

test("missing-record deletion is skipped when POS fetch is incomplete", async () => {
  const client = createLarkClient([
    {
      record_id: "existing",
      created_time: "100",
      fields: { "Unique Key": "order:missing" },
    },
  ]);
  const summary = await syncTable({
    ...common,
    larkClient: client,
    mappedRecords: [],
    dryRun: true,
    posFetchComplete: false,
  });
  assert.equal(summary.deleteCount, 0);
});
