export function chunk(items, size = 100) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Batch size must be a positive integer");
  }

  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
