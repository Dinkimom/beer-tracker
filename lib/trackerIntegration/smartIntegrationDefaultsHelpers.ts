import type { TrackerFieldRowLite } from './smartIntegrationDefaults';

export function normTrackerFieldLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function fieldLabelBlob(row: TrackerFieldRowLite): string {
  return normTrackerFieldLabel([row.display, row.name, row.key].filter(Boolean).join(' '));
}

function matchesFunctionalTeamKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/_/g, '');
  return normalized === 'functionalteam' || normalized === 'functionalteams';
}

function matchesFunctionalTeamLabel(blob: string): boolean {
  if (!blob) {
    return false;
  }
  if (blob.includes('функциональн') && blob.includes('команд')) {
    return true;
  }
  return blob.includes('functional') && blob.includes('team');
}

export function isFunctionalTeamFieldRow(row: TrackerFieldRowLite): boolean {
  const key = (row.key ?? '').trim().toLowerCase().replace(/_/g, '');
  if (matchesFunctionalTeamKey(key)) {
    return true;
  }
  return matchesFunctionalTeamLabel(fieldLabelBlob(row));
}

export function findFirstQaEnumValue(enumValues: string[]): string {
  for (const v of enumValues) {
    const t = v.trim();
    if (!t) {
      continue;
    }
    return t;
  }
  return '';
}
