function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

function appendSurrogatePair(out: string, s: string, index: number): { nextIndex: number; out: string } {
  const c1 = index + 1 < s.length ? s.charCodeAt(index + 1) : 0;
  if (isLowSurrogate(c1)) {
    return { nextIndex: index + 1, out: out + s.slice(index, index + 2) };
  }
  return { nextIndex: index, out: `${out  }\uFFFD` };
}

function appendSanitizedCodeUnit(out: string, s: string, index: number): { nextIndex: number; out: string } {
  const c0 = s.charCodeAt(index);
  if (c0 === 0) {
    return { nextIndex: index, out };
  }
  if (isHighSurrogate(c0)) {
    return appendSurrogatePair(out, s, index);
  }
  if (isLowSurrogate(c0)) {
    return { nextIndex: index, out: `${out  }\uFFFD` };
  }
  return { nextIndex: index, out: out + s.charAt(index) };
}

export function sanitizeStringForPostgresJsonb(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const step = appendSanitizedCodeUnit(out, s, i);
    out = step.out;
    i = step.nextIndex + 1;
  }
  return out;
}

function sanitizePrimitiveValue(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeStringForPostgresJsonb(input);
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }
  if (typeof input === 'bigint') {
    return input.toString();
  }
  if (input instanceof Date) {
    return input.toISOString();
  }
  return String(input);
}

function sanitizeObjectRecord(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    const v = input[key];
    if (v === undefined) {
      continue;
    }
    out[key] = deepSanitizeForPostgresJsonb(v);
  }
  return out;
}

export function deepSanitizeForPostgresJsonb(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input !== 'object') {
    return sanitizePrimitiveValue(input);
  }
  if (Array.isArray(input)) {
    return input.map(deepSanitizeForPostgresJsonb);
  }
  return sanitizeObjectRecord(input as Record<string, unknown>);
}

export function stringifyForPostgresJsonb(value: unknown): string {
  return JSON.stringify(deepSanitizeForPostgresJsonb(value));
}
