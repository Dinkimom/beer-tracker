export function parseSprintIdsCsv(sprintIdsStr: string | null): number[] {
  if (!sprintIdsStr) {
    return [];
  }
  return sprintIdsStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}
