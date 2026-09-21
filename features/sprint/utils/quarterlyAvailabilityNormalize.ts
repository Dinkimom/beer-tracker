import type {
  BoardAvailabilityEvent,
  QuarterlyAvailability,
  TechSprintEntry,
  VacationEntry,
} from '@/types/quarterly';

/** Единый список событий для свимлейна и валидации занятости. */
export function normalizeQuarterlyAvailabilityToBoardEvents(
  availability: QuarterlyAvailability | null | undefined
): BoardAvailabilityEvent[] {
  if (!availability) return [];
  if (availability.boardEvents?.length) {
    return availability.boardEvents;
  }
  const out: BoardAvailabilityEvent[] = [];
  for (const v of availability.vacations) {
    out.push(vacationEntryToBoardEvent(v));
  }
  for (const t of availability.techSprints) {
    out.push(techSprintEntryToBoardEvent(t));
  }
  return out;
}

export function quarterlyAvailabilityHasBlockingSegments(
  availability: QuarterlyAvailability | null | undefined
): boolean {
  return normalizeQuarterlyAvailabilityToBoardEvents(availability).length > 0;
}

function vacationEntryToBoardEvent(v: VacationEntry): BoardAvailabilityEvent {
  return {
    id: v.id,
    memberId: v.memberId,
    memberName: v.memberName,
    startDate: v.startDate,
    endDate: v.endDate,
    eventType: 'vacation',
  };
}

function techSprintEntryToBoardEvent(t: TechSprintEntry): BoardAvailabilityEvent {
  return {
    id: t.id,
    memberId: t.memberId,
    memberName: t.memberName,
    startDate: t.startDate,
    endDate: t.endDate,
    eventType: 'tech_sprint',
    techSprintSubtype: t.type,
  };
}
