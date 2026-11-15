export type AvailabilityCardKind = 'duty' | 'sick_leave' | 'vacation';

const KIND_MESSAGE_KEYS: Record<AvailabilityCardKind, string> = {
  duty: 'sprintPlanner.swimlane.availability.duty',
  sick_leave: 'sprintPlanner.swimlane.availability.sickLeave',
  vacation: 'sprintPlanner.swimlane.availability.vacation',
};

export function availabilityKindMessageKey(kind: AvailabilityCardKind): string {
  return KIND_MESSAGE_KEYS[kind];
}
