import type { Developer } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';

import { WORKING_DAYS } from '@/constants';
import {
  normalizeQuarterlyAvailabilityToBoardEvents,
  quarterlyAvailabilityHasBlockingSegments,
} from '@/features/sprint/utils/quarterlyAvailabilityNormalize';
import { availabilityKindMessageKey } from '@/features/swimlane/utils/availabilityCardKind';
import { getSegmentsForDeveloper } from '@/features/swimlane/utils/availabilitySegments';

export function buildAssigneePickerAvailabilityLines(input: {
  availability?: QuarterlyAvailability | null;
  developers: Developer[];
  sprintStartDate: Date;
  t: (key: string) => string;
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
        .map((segment) => `${input.t(availabilityKindMessageKey(segment.kind))} ${segment.dateRangeLabel}`)
        .join('; ')
    );
  });
  return map;
}
