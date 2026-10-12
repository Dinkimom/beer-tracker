const MAX_DISPLAY_LENGTH = 200;

/** Строка для карточки из значения поля трекера. Пустые и нечитаемые значения пропускаются. */
export function customFieldDisplayValue(value: unknown): string | null {
  const text = displayValue(value);
  if (!text) {
    return null;
  }
  return text.length > MAX_DISPLAY_LENGTH ? text.slice(0, MAX_DISPLAY_LENGTH) : text;
}

export function customFieldDisplayMap(
  fields: Record<string, unknown> | undefined
): Record<string, string> | undefined {
  if (!fields) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const display = customFieldDisplayValue(value);
    if (display) {
      out[key] = display;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function displayValue(value: unknown): string | null {
  const scalar = scalarDisplay(value);
  if (scalar !== undefined) {
    return scalar;
  }
  if (Array.isArray(value)) {
    return joinDisplayValues(value);
  }
  if (typeof value === 'object' && value !== null) {
    return displayRecord(value as Record<string, unknown>);
  }
  return null;
}

function scalarDisplay(value: unknown): string | null | undefined {
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return undefined;
}

function joinDisplayValues(values: unknown[]): string | null {
  const parts = values.map((item) => displayValue(item)).filter((item): item is string => item != null);
  return parts.length > 0 ? parts.join(', ') : null;
}

function displayRecord(value: Record<string, unknown>): string | null {
  if (typeof value.display === 'string' && value.display.trim()) {
    return value.display.trim();
  }
  if (typeof value.name === 'string' && value.name.trim()) {
    return value.name.trim();
  }
  if (typeof value.value === 'string' && value.value.trim()) {
    return value.value.trim();
  }
  if (typeof value.key === 'string' && value.key.trim()) {
    return value.key.trim();
  }
  return null;
}
