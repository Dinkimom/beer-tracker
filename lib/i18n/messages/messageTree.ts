/**
 * Shared helpers for walking string-only message trees (ru/en parity, export/import).
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectLeafKeysFromObject(value: Record<string, unknown>, prefix: string): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(value).sort()) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    keys.push(...collectLeafKeys(value[key], nextPrefix));
  }
  return keys;
}

/** All dot-paths to string leaves, depth-first with sorted object keys at each level. */
export function collectLeafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') {
    return prefix ? [prefix] : [];
  }

  if (!isPlainObject(value)) {
    throw new Error(`Unsupported messages node at "${prefix || '<root>'}"`);
  }

  return collectLeafKeysFromObject(value, prefix);
}

/** Flat map dot-key → string, stable key order. */
export function flattenMessagesToDotMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of collectLeafKeys(value)) {
    const v = getStringAtDotPath(value, key);
    if (typeof v !== 'string') {
      throw new Error(`Expected string at "${key}"`);
    }
    out[key] = v;
  }
  return out;
}

function getStringAtDotPath(root: unknown, dotPath: string): string | undefined {
  const parts = dotPath.split('.');
  let cur: unknown = root;
  for (const p of parts) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function setStringAtDotPath(root: Record<string, unknown>, dotPath: string, nextValue: string): void {
  const parts = dotPath.split('.');
  let cur: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const next = cur[p];
    if (!isPlainObject(next)) {
      throw new Error(`Cannot set "${dotPath}": missing or non-object segment "${p}"`);
    }
    cur = next;
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in cur)) {
    throw new Error(`Cannot set "${dotPath}": missing leaf key "${leaf}"`);
  }
  if (typeof cur[leaf] !== 'string') {
    throw new Error(`Cannot set "${dotPath}": existing value is not a string`);
  }
  cur[leaf] = nextValue;
}

export function mergeDotStringMapIntoMessages<T extends Record<string, unknown>>(
  base: T,
  overrides: Record<string, string>
): T {
  const clone = structuredClone(base) as T;
  const root = clone as Record<string, unknown>;
  for (const [dotKey, val] of Object.entries(overrides)) {
    setStringAtDotPath(root, dotKey, val);
  }
  return clone;
}

/** Single-quoted TS string literal (matches style of `en.ts` / `ru.ts`). */
export function quoteTsString(s: string): string {
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `'${escaped}'`;
}

/** Serialize a string-only nested object as TS object literal body (no wrapping braces). */
function formatMessagesObjectBody(obj: Record<string, unknown>, indent: string): string {
  const keys = Object.keys(obj);
  const lines: string[] = [];
  const nextIndent = `${indent}  `;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string') {
      lines.push(`${nextIndent}${k}: ${quoteTsString(v)}`);
    } else if (isPlainObject(v)) {
      lines.push(`${nextIndent}${k}: {\n${formatMessagesObjectBody(v, nextIndent)}\n${nextIndent}}`);
    } else {
      throw new Error(`Unsupported value type for key "${k}"`);
    }
  }
  return lines.join(',\n');
}

export function formatMessagesModule(constName: string, root: Record<string, unknown>): string {
  const body = formatMessagesObjectBody(root, '');
  return `export const ${constName} = {\n${body}\n} as const;\n`;
}
