export function getLarkTextField(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => {
        if (entry == null) return null;
        if (typeof entry === "string" || typeof entry === "number") return String(entry);
        return entry.text ?? entry.name ?? null;
      })
      .filter((entry) => entry != null);
    return parts.length ? parts.join("") : null;
  }

  if (typeof value === "object") {
    return value.text ?? value.name ?? null;
  }
  return null;
}

export function getLarkNumberField(value) {
  if (value == null || value === "") return null;
  const raw = getLarkTextField(value) ?? value;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

export function getLarkArrayField(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
