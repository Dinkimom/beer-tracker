function parseSingleTrackerStatusRowMeta(s: {
  display?: string;
  key?: string;
  statusType?: { key?: string };
}): {
  display: string;
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
  return {
    display: typeof s.display === 'string' ? s.display : key,
    key,
    statusTypeKey: tk || undefined,
  };
}

export function parseTrackerStatusRowsMeta(
  statuses: Array<{
    display?: string;
    key?: string;
    statusType?: { key?: string };
  }>
): Array<{
  display: string;
  key: string;
  statusTypeKey: string | undefined;
}> {
  const statusRowsMeta: Array<{
    display: string;
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
