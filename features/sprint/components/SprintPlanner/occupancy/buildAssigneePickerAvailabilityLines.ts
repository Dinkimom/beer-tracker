import type { Developer } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';

import { WORKING_DAYS } from '@/constants';
import {
  normalizeQuarterlyAvailabilityToBoardEvents,
  quarterlyAvailabilityHasBlockingSegments,
} from '@/features/sprint/utils/quarterlyAvailabilityNormalize';
import { getSegmentsForDeveloper } from '@/features/swimlane/utils/availabilitySegments';

const AVAILABILITY_LABELS: Record<string, string> = {
  vacation: 'Отпуск',
  sick_leave: 'Больничный',
  duty: 'Дежурство',
  'tech-sprint-web': 'Техспринт (Web)',
  'tech-sprint-back': 'Техспринт (Back)',
  'tech-sprint-qa': 'Техспринт (QA)',
};

export function buildAssigneePickerAvailabilityLines(input: {
  availability?: QuarterlyAvailability | null;
  developers: Developer[];
  sprintStartDate: Date;
}): Map<string, string> {
  if (!input.availability || !quarterlyAvailabilityHasBlockingSegments(input.availability)) {
    return new Map();
  }
  const boardEvents = normalizeQuarterlyAvailabilityToBoardEvents(input.availability);
  const map = new Map<string, string>();
  input.developers.forEach((developer) => {
    const segments = getSegmentsForDeveloper(
      developer.id,
      input.sprintStartDate,
      boardEvents,
      WORKING_DAYS
    );
    if (segments.length === 0) {
      return;
    }
    map.set(
      developer.id,
      segments
        .map((segment) => `${AVAILABILITY_LABELS[segment.kind] ?? segment.kind} ${segment.dateRangeLabel}`)
        .join('; ')
    );
  });
  return map;
}
