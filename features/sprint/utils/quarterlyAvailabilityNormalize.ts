import type { BoardAvailabilityEvent, QuarterlyAvailability, VacationEntry } from '@/types/quarterly';

/** Единый список событий для свимлейна и валидации занятости. */
export function normalizeQuarterlyAvailabilityToBoardEvents(
  availability: QuarterlyAvailability | null | undefined
): BoardAvailabilityEvent[] {
  if (!availability) return [];
  if (availability.boardEvents?.length) {
    return availability.boardEvents;
  }
  return availability.vacations.map(vacationEntryToBoardEvent);
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
