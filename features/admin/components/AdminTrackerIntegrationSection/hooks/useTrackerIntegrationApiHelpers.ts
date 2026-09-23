export function trackerStatusIdentity(row: { id?: string; key: string }): string {
  const id = row.id?.trim();
  return id || row.key;
}

function parseSingleTrackerStatusRowMeta(s: {
  display?: string;
  id?: string;
  key?: string;
  statusType?: { key?: string };
}): {
  display: string;
  id?: string;
  key: string;
  statusTypeKey: string | undefined;
} | null {
  const key = typeof s.key === 'string' ? s.key.trim() : '';
  if (!key) {
    return null;
  }
  const tk =
    s.statusType && typeof s.statusType.key === 'string'
      ? s.statusType.key.trim()
      : undefined;
  const id = typeof s.id === 'string' ? s.id.trim() : '';
  return {
    display: typeof s.display === 'string' ? s.display : key,
    ...(id ? { id } : {}),
    key,
    statusTypeKey: tk || undefined,
  };
}

export function parseTrackerStatusRowsMeta(
  statuses: Array<{
    display?: string;
    id?: string;
    key?: string;
    statusType?: { key?: string };
  }>
): Array<{
  display: string;
  id?: string;
  key: string;
  statusTypeKey: string | undefined;
}> {
  const statusRowsMeta: Array<{
    display: string;
    id?: string;
    key: string;
    statusTypeKey: string | undefined;
  }> = [];

  for (const s of statuses) {
    const row = parseSingleTrackerStatusRowMeta(s);
    if (row) {
      statusRowsMeta.push(row);
    }
  }

  return statusRowsMeta;
}

/**
 * Remap legacy name-keyed palette / readyStatus overrides onto unique status ids.
 * Id-keyed entries win when both name and id are present for the same status.
 */
export function remapStatusPaletteKeysToStatusId(
  paletteByKey: Record<string, string>,
  statuses: Array<{ id?: string; key: string }>
): Record<string, string> {
  const keyToId = new Map<string, string>();
  for (const row of statuses) {
    const id = row.id?.trim();
    if (id && id !== row.key) {
      keyToId.set(row.key, id);
    }
  }
  if (keyToId.size === 0) {
    return paletteByKey;
  }
  const out: Record<string, string> = {};
  for (const [rawKey, palette] of Object.entries(paletteByKey)) {
    const trimmed = palette.trim();
    if (!trimmed) {
      continue;
    }
    const trimmedKey = rawKey.trim();
    const mappedId = keyToId.get(trimmedKey);
    if (mappedId) {
      if (out[mappedId] === undefined) {
        out[mappedId] = trimmed;
      }
      continue;
    }
    out[trimmedKey] = trimmed;
  }
  return out;
}

/** Remap a single status key (e.g. releaseReady) from name → id when metadata is known. */
export function remapStatusKeyToStatusId(
  statusKey: string,
  statuses: Array<{ id?: string; key: string }>
): string {
  const trimmed = statusKey.trim();
  if (!trimmed) {
    return trimmed;
  }
  for (const row of statuses) {
    const id = row.id?.trim();
    if (id && id !== row.key && row.key === trimmed) {
      return id;
    }
  }
  return trimmed;
}
