/**
 * Утилита для обработки changelog и вычисления длительности статусов
 */

import type { StatusDuration } from '../types';
import type { ChangelogEntry } from '@/types/tracker';

import {
  getFridayEndOfDay,
  getNextWorkingDay,
  getWorkingHoursBetween,
  isFullyOnWeekend,
  isWeekend,
} from '@/utils/dateUtils';

interface StatusHistoryItem {
  createdBy?: {
    display?: string;
    id?: string;
  };
  endTime: string | null;
  startTime: string;
  statusKey: string;
  statusName: string;
}

function sortChangelogByUpdatedAt(changelog: ChangelogEntry[]): ChangelogEntry[] {
  return [...changelog].sort((a, b) => {
    const timeDiff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function isValidStatusTransition(
  fromStatusKey: string | null,
  currentStatusKey: string | null,
  historyLength: number
): boolean {
  if (historyLength === 0) return fromStatusKey === null;
  return fromStatusKey === currentStatusKey;
}

function closePreviousStatusIfNeeded(
  statusHistory: StatusHistoryItem[],
  entryUpdatedAt: string
): void {
  if (statusHistory.length === 0) return;
  const previousStatus = statusHistory[statusHistory.length - 1];
  const endDate = new Date(entryUpdatedAt);
  if (isWeekend(endDate)) {
    previousStatus.endTime = getFridayEndOfDay(endDate).toISOString();
  } else {
    previousStatus.endTime = entryUpdatedAt;
  }
}

function appendStatusHistoryFromEntry(entry: ChangelogEntry, statusHistory: StatusHistoryItem[]): void {
  const statusField = entry.fields?.find(f => f.field.id === 'status');
  if (!statusField?.to) return;

  const fromStatusKey = statusField.from?.key || null;
  const toStatusKey = statusField.to.key;
  const toStatusName = statusField.to.display;

  const currentStatusKey =
    statusHistory.length > 0 ? statusHistory[statusHistory.length - 1].statusKey : null;

  if (
    !isValidStatusTransition(fromStatusKey, currentStatusKey, statusHistory.length)
  ) {
    console.warn(`Invalid status transition detected in changelog:`, {
      actualFrom: fromStatusKey,
      entryId: entry.id,
      entryTime: entry.updatedAt,
      expectedFrom: currentStatusKey,
      historyLength: statusHistory.length,
      to: toStatusKey,
    });
    return;
  }

  if (toStatusKey === currentStatusKey) return;

  closePreviousStatusIfNeeded(statusHistory, entry.updatedAt);

  statusHistory.push({
    createdBy: entry.createdBy,
    endTime: null,
    startTime: entry.updatedAt,
    statusKey: toStatusKey,
    statusName: toStatusName,
  });
}

function buildStatusHistory(sorted: ChangelogEntry[]): StatusHistoryItem[] {
  const statusHistory: StatusHistoryItem[] = [];
  for (const entry of sorted) {
    appendStatusHistoryFromEntry(entry, statusHistory);
  }
  return statusHistory;
}

function mapHistoryItemToDuration(status: StatusHistoryItem, nowMs: number): StatusDuration | null {
  const startDate = new Date(status.startTime);
  const endDate = status.endTime ? new Date(status.endTime) : new Date(nowMs);

  const normalizedStartDate = isWeekend(startDate) ? getNextWorkingDay(startDate) : startDate;

  if (isFullyOnWeekend(startDate, endDate)) return null;

  const startTimeMs = normalizedStartDate.getTime();
  const endTimeMs = endDate.getTime();
  const durationMs = getWorkingHoursBetween(startTimeMs, endTimeMs);

  if (durationMs === 0) return null;

  return {
    createdBy: status.createdBy,
    durationMs,
    endTime: status.endTime,
    endTimeMs,
    startTime: status.startTime,
    startTimeMs: normalizedStartDate.getTime(),
    statusKey: status.statusKey,
    statusName: status.statusName,
  };
}

function durationsFromStatusHistory(statusHistory: StatusHistoryItem[]): StatusDuration[] {
  const nowMs = new Date().getTime();
  return statusHistory
    .map((status) => mapHistoryItemToDuration(status, nowMs))
    .filter((d): d is StatusDuration => d !== null);
}

export function processChangelog(changelog: ChangelogEntry[]): StatusDuration[] {
  const sorted = sortChangelogByUpdatedAt(changelog);
  const statusHistory = buildStatusHistory(sorted);
  if (statusHistory.length === 0) return [];
  return durationsFromStatusHistory(statusHistory);
}
