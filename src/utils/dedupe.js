import { getLarkTextField } from "./larkFields.js";

function timestamp(value) {
  if (value == null || value === "") return Number.NEGATIVE_INFINITY;
  if (typeof value === "number") return value;
  if (/^\d+(\.\d+)?$/.test(String(value))) return Number(value);
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

export function dedupeMappedRecords(records) {
  const map = new Map();

  records.forEach((record, index) => {
    if (!record?.uniqueKey) {
      throw new Error(`Mapped record at index ${index} is missing uniqueKey`);
    }

    const existing = map.get(record.uniqueKey);
    const candidateTime = Math.max(
      timestamp(record.rawUpdatedAt),
      timestamp(record.rawInsertedAt),
    );
    const existingTime = existing
      ? Math.max(timestamp(existing.rawUpdatedAt), timestamp(existing.rawInsertedAt))
      : Number.NEGATIVE_INFINITY;

    if (!existing || candidateTime >= existingTime) {
      map.set(record.uniqueKey, record);
    }
  });

  return [...map.values()];
}

export function buildLarkUniqueIndex(
  records,
  uniqueFieldName,
  { keyResolver } = {},
) {
  const canonicalMap = new Map();
  const duplicateRecordIds = [];

  for (const record of records) {
    const key =
      keyResolver?.(record) ??
      getLarkTextField(record?.fields?.[uniqueFieldName]);
    if (!key) continue;

    const existing = canonicalMap.get(key);
    if (!existing) {
      canonicalMap.set(key, record);
      continue;
    }

    const existingTime = timestamp(existing.created_time);
    const candidateTime = timestamp(record.created_time);
    if (candidateTime >= existingTime) {
      if (existing.record_id) duplicateRecordIds.push(existing.record_id);
      canonicalMap.set(key, record);
    } else {
      if (record.record_id) duplicateRecordIds.push(record.record_id);
    }
  }

  return { canonicalMap, duplicateRecordIds };
}
