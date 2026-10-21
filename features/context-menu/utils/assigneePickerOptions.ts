import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';
import type { Developer } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';

import { WORKING_DAYS } from '@/constants';
import {
  normalizeQuarterlyAvailabilityToBoardEvents,
  quarterlyAvailabilityHasBlockingSegments,
} from '@/features/sprint/utils/quarterlyAvailabilityNormalize';
import { getSegmentsForDeveloper } from '@/features/swimlane/utils/availabilitySegments';

type AssigneePlatformKey = 'Back' | 'Other' | 'QA' | 'Web';

export interface AssigneePickerGroup {
  developers: Developer[];
  platformKey: AssigneePlatformKey;
  /** Платформа группы совпадает с платформой задачи. */
  suitable: boolean;
}

function getDeveloperPlatformKey(developer: Developer): AssigneePlatformKey {
  if (developer.role === 'tester') return 'QA';
  const platforms = developer.platforms ?? [];
  if (platforms.includes('back')) return 'Back';
  if (platforms.includes('web')) return 'Web';
  return 'Other';
}

/** Группа пикера, которой соответствует проставленная платформа задачи. */
export function assigneePlatformIsSuitable(
  platformKey: AssigneePlatformKey,
  taskTeam: string | undefined
): boolean {
  const team = (taskTeam ?? '').toLowerCase();
  if (team === 'qa') return platformKey === 'QA';
  if (team === 'back') return platformKey === 'Back';
  if (team === 'web') return platformKey === 'Web';
  if (team === 'devops') return platformKey === 'Back' || platformKey === 'Web';
  return false;
}

/** Порядок платформ: подходящая платформе задачи — первой. */
export function getAssigneePlatformOrder(taskTeam: string | undefined): AssigneePlatformKey[] {
  const team = (taskTeam ?? '').toLowerCase();
  if (team === 'qa') return ['QA', 'Back', 'Web', 'Other'];
  if (team === 'web') return ['Web', 'Back', 'QA', 'Other'];
  return ['Back', 'Web', 'QA', 'Other'];
}

/** Непустые группы по платформам в порядке `getAssigneePlatformOrder`. */
export function groupAssigneesByPlatform(
  developers: Developer[],
  taskTeam: string | undefined
): AssigneePickerGroup[] {
  const byPlatform = new Map<AssigneePlatformKey, Developer[]>();
  developers.forEach((developer) => {
    const key = getDeveloperPlatformKey(developer);
    byPlatform.set(key, [...(byPlatform.get(key) ?? []), developer]);
  });
  return getAssigneePlatformOrder(taskTeam).flatMap((platformKey) => {
    const list = byPlatform.get(platformKey) ?? [];
    return list.length > 0
      ? [{ developers: list, platformKey, suitable: assigneePlatformIsSuitable(platformKey, taskTeam) }]
      : [];
  });
}

/** Отсутствия участников в спринте; подпись собирает UI (вид — через i18n). */
export function buildAssigneeAvailabilitySegments(input: {
  availability?: QuarterlyAvailability | null;
  developers: Developer[];
  sprintStartDate: Date;
}): Map<string, AvailabilitySegment[]> {
  const map = new Map<string, AvailabilitySegment[]>();
  if (!input.availability || !quarterlyAvailabilityHasBlockingSegments(input.availability)) {
    return map;
  }
  const boardEvents = normalizeQuarterlyAvailabilityToBoardEvents(input.availability);
  input.developers.forEach((developer) => {
    const segments = getSegmentsForDeveloper(
      developer.id,
      input.sprintStartDate,
      boardEvents,
      WORKING_DAYS
    );
    if (segments.length > 0) {
      map.set(developer.id, segments);
    }
  });
  return map;
}
