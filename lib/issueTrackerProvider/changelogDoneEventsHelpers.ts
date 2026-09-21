interface NormalizedChangelogEntry {
  fields?: Array<{
    field: { display?: string; id: string };
    from?: { display?: string; id?: string; key?: string } | null;
    to?: { display?: string; id?: string; key?: string } | null;
  }>;
  updatedAt: string;
}

function isDoneStatus(statusKey: string | undefined, mapStatus: (s: string) => string | undefined): boolean {
  if (!statusKey) return false;
  return mapStatus(statusKey.toLowerCase()) === 'done';
}

function pushStatusDoneTransition(
  events: Array<{ date: string; isDone: boolean }>,
  entry: NormalizedChangelogEntry,
  field: NonNullable<NormalizedChangelogEntry['fields']>[number],
  mapStatus: (s: string) => string | undefined
): void {
  if (field?.field?.id !== 'status') {
    return;
  }
  const fromIsDone = isDoneStatus(field.from?.key, mapStatus);
  const toIsDone = isDoneStatus(field.to?.key, mapStatus);
  if (fromIsDone === toIsDone) {
    return;
  }
  events.push({ date: entry.updatedAt, isDone: toIsDone });
}

export function processChangelogToDoneEvents(
  entries: NormalizedChangelogEntry[],
  mapStatus: (s: string) => string | undefined
): Array<{ date: string; isDone: boolean }> {
  const events: Array<{ date: string; isDone: boolean }> = [];
  for (const entry of entries) {
    if (!entry.fields) continue;
    for (const field of entry.fields) {
      pushStatusDoneTransition(events, entry, field, mapStatus);
    }
  }
  return events;
}
