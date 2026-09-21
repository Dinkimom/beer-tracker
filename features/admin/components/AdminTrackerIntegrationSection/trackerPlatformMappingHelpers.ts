type Translate = (key: string) => string;

export interface TrackerPlatformMappingRow {
  changed: boolean;
  trackerValue: string;
  unmapped: boolean;
}

export function platformMappingBadgeClass(row: TrackerPlatformMappingRow): string {
  if (row.unmapped) {
    return 'border-amber-300/80 bg-amber-100/70 text-amber-800 dark:border-amber-700/80 dark:bg-amber-900/30 dark:text-amber-200';
  }
  if (row.changed) {
    return 'border-blue-300/80 bg-blue-100/70 text-blue-800 dark:border-blue-700/80 dark:bg-blue-900/30 dark:text-blue-200';
  }
  return 'border-emerald-300/80 bg-emerald-100/70 text-emerald-800 dark:border-emerald-700/80 dark:bg-emerald-900/30 dark:text-emerald-200';
}

export function platformMappingStatusLabel(row: TrackerPlatformMappingRow, t: Translate): string {
  if (row.unmapped) {
    return t('admin.plannerIntegration.platformMapping.unmapped');
  }
  if (row.changed) {
    return t('admin.plannerIntegration.platformMapping.changed');
  }
  return t('admin.plannerIntegration.platformMapping.rowOk');
}
