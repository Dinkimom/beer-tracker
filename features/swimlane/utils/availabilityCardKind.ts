export type AvailabilityCardKind =
  | 'duty'
  | 'sick_leave'
  | 'tech-sprint-back'
  | 'tech-sprint-qa'
  | 'tech-sprint-web'
  | 'vacation';

const KIND_MESSAGE_KEYS: Record<AvailabilityCardKind, string> = {
  duty: 'sprintPlanner.swimlane.availability.duty',
  sick_leave: 'sprintPlanner.swimlane.availability.sickLeave',
  'tech-sprint-back': 'sprintPlanner.swimlane.availability.techSprintBack',
  'tech-sprint-qa': 'sprintPlanner.swimlane.availability.techSprintQa',
  'tech-sprint-web': 'sprintPlanner.swimlane.availability.techSprintWeb',
  vacation: 'sprintPlanner.swimlane.availability.vacation',
};

export function availabilityKindMessageKey(kind: AvailabilityCardKind): string {
  return KIND_MESSAGE_KEYS[kind];
}
