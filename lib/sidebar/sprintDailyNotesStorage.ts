export type SprintDailyNotes = Record<number, string>;

export function sprintDailyNotesStorageKey(sprintId: number): string {
  return `beer-tracker-sprint-daily-notes-${sprintId}`;
}

export function parseSprintDailyNotes(raw: unknown): SprintDailyNotes {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const result: SprintDailyNotes = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const dayIndex = Number(key);
    if (Number.isInteger(dayIndex) && dayIndex >= 0 && typeof value === 'string') {
      result[dayIndex] = value;
    }
  }
  return result;
}

export function setDailyNote(
  notes: SprintDailyNotes,
  dayIndex: number,
  text: string
): SprintDailyNotes {
  if (!text.trim()) {
    const { [dayIndex]: _removed, ...rest } = notes;
    return rest;
  }
  return { ...notes, [dayIndex]: text };
}

export function hasDailyNote(notes: SprintDailyNotes, dayIndex: number): boolean {
  return Boolean(notes[dayIndex]?.trim());
}
