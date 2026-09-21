import type { ChangelogEntry } from '@/types/tracker';

import { formatSignedPointsDeltaForDisplay } from '@/lib/pointsUtils';

export function formatReestimationLabel(deltaSP: number, deltaTP: number): string {
  const parts = [
    formatSignedPointsDeltaForDisplay(deltaSP, 'sp'),
    formatSignedPointsDeltaForDisplay(deltaTP, 'tp'),
  ].filter((part): part is string => part != null);
  return parts.join(' ');
}

export interface ReestimationEvent {
  createdBy?: { id?: string; display?: string };
  deltaSP: number;
  deltaTP: number;
  updatedAt: string;
}

function parsePointsDelta(field: NonNullable<ChangelogEntry['fields']>[number]): {
  deltaSP: number;
  deltaTP: number;
} {
  if (field.field.id === 'storyPoints' && field.from != null && field.to != null) {
    const fromVal = parseInt(String((field.from as { key?: string }).key ?? 0), 10) || 0;
    const toVal = parseInt(String((field.to as { key?: string }).key ?? 0), 10) || 0;
    return { deltaSP: toVal - fromVal, deltaTP: 0 };
  }
  if (field.field.id === 'testPoints' && field.from != null && field.to != null) {
    const fromVal = parseInt(String((field.from as { key?: string }).key ?? 0), 10) || 0;
    const toVal = parseInt(String((field.to as { key?: string }).key ?? 0), 10) || 0;
    return { deltaSP: 0, deltaTP: toVal - fromVal };
  }
  return { deltaSP: 0, deltaTP: 0 };
}

export function getReestimationEvents(changelog: ChangelogEntry[]): ReestimationEvent[] {
  const events: ReestimationEvent[] = [];
  for (const entry of changelog) {
    let deltaSP = 0;
    let deltaTP = 0;
    for (const field of entry.fields ?? []) {
      const delta = parsePointsDelta(field);
      deltaSP += delta.deltaSP;
      deltaTP += delta.deltaTP;
    }
    if (deltaSP !== 0 || deltaTP !== 0) {
      events.push({
        deltaSP,
        deltaTP,
        updatedAt: entry.updatedAt,
        createdBy: entry.createdBy,
      });
    }
  }
  return events;
}

export function isReestimationCellVisible(
  cellPosition: number,
  timelineStartCell: number,
  nowCell: number,
  totalParts: number
): boolean {
  return (
    cellPosition >= timelineStartCell &&
    cellPosition <= nowCell &&
    cellPosition >= 0 &&
    cellPosition <= totalParts
  );
}

export function computeReestimationMarkerLeftPercent(
  cellPosition: number,
  timelineStartCell: number,
  nowCell: number
): number {
  const spanCellsEv = nowCell - timelineStartCell;
  const leftInSpan = cellPosition - timelineStartCell;
  return spanCellsEv > 0 ? (leftInSpan / spanCellsEv) * 100 : 0;
}
