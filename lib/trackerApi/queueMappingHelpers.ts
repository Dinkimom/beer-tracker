function parseNumericQueueId(rawId: string): number | undefined {
  const parsed = Number.parseInt(rawId, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseQueueId(rawId: unknown): number | undefined {
  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    return rawId;
  }
  if (typeof rawId === 'string' && /^\d+$/.test(rawId)) {
    return parseNumericQueueId(rawId);
  }
  return undefined;
}

function resolveQueueName(record: Record<string, unknown>, fallback: string): string {
  if (typeof record.name === 'string' && record.name.trim()) {
    return record.name.trim();
  }
  if (typeof record.summary === 'string' && record.summary.trim()) {
    return record.summary.trim();
  }
  return fallback;
}

export function mapRawQueue(raw: unknown): { id?: number; key: string; name: string } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const key = typeof record.key === 'string' ? record.key.trim() : '';
  if (!key) {
    return null;
  }
  return {
    id: parseQueueId(record.id),
    key,
    name: resolveQueueName(record, key),
  };
}
