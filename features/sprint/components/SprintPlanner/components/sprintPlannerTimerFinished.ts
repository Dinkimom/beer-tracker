import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { getFromStorage, saveToStorage } from '@/hooks/localStorage/storagePrimitives';

export function sprintPlannerTimerFinishedStamp(
  status: string,
  durationMs: number,
  updatedAt: number
): string {
  if (status !== 'finished' || durationMs <= 0) {
    return '';
  }
  return `${updatedAt}:${durationMs}`;
}

export function sprintPlannerTimerDismissedStorageKey(sprintId: number): string {
  return `${STORAGE_KEYS.SPRINT_TIMER_DISMISSED_FINISHED_PREFIX}:${sprintId}`;
}

export function isSprintPlannerTimerFinishedDismissed(
  sprintId: number | null,
  finishedStamp: string
): boolean {
  if (sprintId == null || finishedStamp === '') {
    return false;
  }
  return getFromStorage(sprintPlannerTimerDismissedStorageKey(sprintId), '') === finishedStamp;
}

export function dismissSprintPlannerTimerFinished(
  sprintId: number | null,
  finishedStamp: string
): void {
  if (sprintId == null || finishedStamp === '') {
    return;
  }
  saveToStorage(sprintPlannerTimerDismissedStorageKey(sprintId), finishedStamp);
}

export function shouldAutoOpenFinishedSprintPlannerTimer(
  finishedStamp: string,
  appliedFinishedStamp: string,
  dismissed: boolean
): boolean {
  return finishedStamp !== '' && finishedStamp !== appliedFinishedStamp && !dismissed;
}
