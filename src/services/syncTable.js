import { buildLarkUniqueIndex, dedupeMappedRecords } from "../utils/dedupe.js";
import { getLarkTextField } from "../utils/larkFields.js";

export async function syncTable({
  tableName,
  larkClient,
  token,
  tableConfig,
  dateFieldName,
  dateRange,
  mappedRecords,
  uniqueFieldName = "Unique Key",
  deleteStatuses = [],
  dryRun = false,
  posFetchComplete = false,
  logger,
}) {
  const posRecords = dedupeMappedRecords(mappedRecords);
  const larkRecords = await larkClient.searchRecords({
    token,
    baseId: tableConfig.base_id,
    tableId: tableConfig.table_id,
    dateFieldName,
    fromMs: dateRange.fromMs,
    toMs: dateRange.toMs,
  });
  const { canonicalMap, duplicateRecordIds } = buildLarkUniqueIndex(
    larkRecords,
    uniqueFieldName,
  );
  const deleteStatusSet = new Set(deleteStatuses);
  const posKeySet = new Set(posRecords.map((record) => record.uniqueKey));
  const toCreate = [];
  const toUpdate = [];
  const toDelete = new Set(duplicateRecordIds);

  for (const record of posRecords) {
    const existing = canonicalMap.get(record.uniqueKey);
    const status = getLarkTextField(record.fields?.["Trạng thái"]);

    if (deleteStatusSet.has(status)) {
      if (existing?.record_id) toDelete.add(existing.record_id);
      continue;
    }

    if (existing?.record_id) {
      toUpdate.push({ record_id: existing.record_id, fields: record.fields });
    } else {
      toCreate.push({ fields: record.fields });
    }
  }

  if (posFetchComplete) {
    for (const larkRecord of larkRecords) {
      if (!larkRecord?.record_id || toDelete.has(larkRecord.record_id)) continue;
      const key = getLarkTextField(larkRecord.fields?.[uniqueFieldName]);
      if (!key || !posKeySet.has(key)) toDelete.add(larkRecord.record_id);
    }
  } else {
    logger?.warn(
      { table_name: tableName },
      "POS fetch was not confirmed complete; missing-record deletion skipped",
    );
  }

  const deleteIds = [...toDelete];
  logger?.info(
    {
      table_name: tableName,
      dry_run: dryRun,
      create: toCreate.length,
      update: toUpdate.length,
      delete: deleteIds.length,
      duplicates_delete: duplicateRecordIds.length,
    },
    "Lark sync plan",
  );

  if (!dryRun) {
    if (deleteIds.length) {
      await larkClient.batchDeleteRecords({
        token,
        baseId: tableConfig.base_id,
        tableId: tableConfig.table_id,
        recordIds: deleteIds,
      });
    }
    if (toUpdate.length) {
      await larkClient.batchUpdateRecords({
        token,
        baseId: tableConfig.base_id,
        tableId: tableConfig.table_id,
        records: toUpdate,
      });
    }
    if (toCreate.length) {
      await larkClient.batchCreateRecords({
        token,
        baseId: tableConfig.base_id,
        tableId: tableConfig.table_id,
        records: toCreate,
      });
    }
  }

  return {
    tableName,
    posRecords: posRecords.length,
    larkRecords: larkRecords.length,
    createCount: toCreate.length,
    updateCount: toUpdate.length,
    deleteCount: deleteIds.length,
    duplicateDeleteCount: duplicateRecordIds.length,
  };
}
