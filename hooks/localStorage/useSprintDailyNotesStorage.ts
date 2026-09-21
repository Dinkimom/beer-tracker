'use client';

import { useCallback } from 'react';

import {
  type SprintDailyNotes,
  setDailyNote,
  sprintDailyNotesStorageKey,
} from '@/lib/sidebar/sprintDailyNotesStorage';

import { useLocalStorage as useLocalStorageBase } from './useLocalStorageBase';

export function useSprintDailyNotesStorage(sprintId: number) {
  const storageKey = sprintDailyNotesStorageKey(sprintId);
  const [notes, setNotesState] = useLocalStorageBase<SprintDailyNotes>(storageKey, {});

  const setNoteForDay = useCallback(
    (dayIndex: number, text: string) => {
      setNotesState((prev) => setDailyNote(prev, dayIndex, text));
    },
    [setNotesState]
  );

  const getNoteForDay = useCallback(
    (dayIndex: number) => notes[dayIndex] ?? '',
    [notes]
  );

  return {
    getNoteForDay,
    notes,
    setNoteForDay,
  };
}
