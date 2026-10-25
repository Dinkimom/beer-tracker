import { isSpCompletedStatusKey } from '@/lib/sprints/sprintTaskCompletion';

interface NormalizedChangelogEntry {
  fields?: Array<{
    field: { display?: string; id: string };
    from?: { display?: string; id?: string; key?: string } | null;
    to?: { display?: string; id?: string; key?: string } | null;
  }>;
  updatedAt: string;
}

function pushStatusDoneTransition(
  events: Array<{ date: string; isDone: boolean }>,
  entry: NormalizedChangelogEntry,
  field: NonNullable<NormalizedChangelogEntry['fields']>[number]
): void {
  if (field?.field?.id !== 'status') {
    return;
  }
  // Нормализация провайдера не знает настроек организации — правила завершения без overrides.
  const fromIsDone = isSpCompletedStatusKey(field.from?.key, null);
  const toIsDone = isSpCompletedStatusKey(field.to?.key, null);
  if (fromIsDone === toIsDone) {
    return;
  }
  events.push({ date: entry.updatedAt, isDone: toIsDone });
}

export function processChangelogToDoneEvents(
  entries: NormalizedChangelogEntry[]
): Array<{ date: string; isDone: boolean }> {
  const events: Array<{ date: string; isDone: boolean }> = [];
  for (const entry of entries) {
    if (!entry.fields) continue;
    for (const field of entry.fields) {
      pushStatusDoneTransition(events, entry, field);
    }
  }
  return events;
}
