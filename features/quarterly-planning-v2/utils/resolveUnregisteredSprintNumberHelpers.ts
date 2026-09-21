import { formatSprintHeaderShortLabel } from './quarterlyTimelineHeader';

function parseSprintHeaderNumber(sprintName: string): number | null {
  const label = formatSprintHeaderShortLabel(sprintName);
  const num = Number.parseInt(label, 10);
  return Number.isFinite(num) ? num : null;
}

export function findPrecedingRegisteredSprintNumber(
  sprintInfos: Array<{ isUnregistered?: boolean; name: string }>,
  index: number
): string | null {
  for (let i = index - 1; i >= 0; i--) {
    const sprint = sprintInfos[i]!;
    if (sprint.isUnregistered) continue;
    const num = parseSprintHeaderNumber(sprint.name);
    if (num != null) {
      return String(num + (index - i));
    }
  }
  return null;
}

export function fallbackUnregisteredSprintNumber(
  sprintInfos: Array<{ startDate: Date }>,
  index: number
): string {
  const startDate = sprintInfos[index]?.startDate;
  const yy = startDate ? startDate.getFullYear() % 100 : 0;
  return String(yy * 100 + index + 1);
}
