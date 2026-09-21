import type { StatusPhaseCell } from '../../utils/statusToCells';
import type { ChangelogEntry } from '@/types/tracker';

function phaseTransitionMatchesPhaseWindow(
  entryTime: number,
  phase: StatusPhaseCell,
  fromStatusKey: string | null,
  toStatusKey: string
): 'end' | 'start' | null {
  const phaseStartTime = new Date(phase.startTime).getTime();
  const phaseEndTime = phase.endTime ? new Date(phase.endTime).getTime() : null;
  if (toStatusKey === phase.statusKey && Math.abs(entryTime - phaseStartTime) < 1000) {
    return 'start';
  }
  if (
    fromStatusKey === phase.statusKey &&
    phaseEndTime !== null &&
    Math.abs(entryTime - phaseEndTime) < 1000
  ) {
    return 'end';
  }
  return null;
}

function transitionFromChangelogEntry(
  entry: ChangelogEntry,
  phase: StatusPhaseCell
): {
  entry: ChangelogEntry;
  fromStatusKey: string | null;
  fromStatusName: string | null;
  toStatusKey: string;
  toStatusName: string;
  timestamp: string;
} | null {
  const statusField = entry.fields?.find((f) => f.field.id === 'status');
  if (!statusField?.to) return null;

  const fromStatusKey = statusField.from?.key || null;
  const fromStatusName = statusField.from?.display || null;
  const toStatusKey = statusField.to.key;
  const toStatusName = statusField.to.display;
  const entryTime = new Date(entry.updatedAt).getTime();
  const match = phaseTransitionMatchesPhaseWindow(entryTime, phase, fromStatusKey, toStatusKey);
  if (!match) return null;

  return {
    entry,
    fromStatusKey,
    fromStatusName,
    toStatusKey,
    toStatusName,
    timestamp: entry.updatedAt,
  };
}

export function collectPhaseStatusTransitions(
  changelog: ChangelogEntry[],
  phase: StatusPhaseCell
): Array<{
  entry: ChangelogEntry;
  fromStatusKey: string | null;
  fromStatusName: string | null;
  toStatusKey: string;
  toStatusName: string;
  timestamp: string;
}> {
  const transitions: Array<{
    entry: ChangelogEntry;
    fromStatusKey: string | null;
    fromStatusName: string | null;
    toStatusKey: string;
    toStatusName: string;
    timestamp: string;
  }> = [];

  for (const entry of changelog) {
    const transition = transitionFromChangelogEntry(entry, phase);
    if (transition) transitions.push(transition);
  }

  return transitions;
}
