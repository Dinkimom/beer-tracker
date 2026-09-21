/**
 * Стили бейджа критичности инцидента (P0–P4 / S1–S4) — свимлейн, сайдбар, занятость.
 */
export function getIncidentSeverityTagClasses(severity: string): string {
  const severityUpper = severity.toUpperCase();
  if (severityUpper === 'S1' || severityUpper === 'P0' || severityUpper === 'P1') {
    return 'bg-red-600 text-white border-red-800 dark:bg-red-950 dark:text-red-200 dark:border-red-500/90 incident-fire-badge';
  }
  if (severityUpper === 'S2' || severityUpper === 'P2') {
    return 'bg-orange-500 text-white border-orange-700 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-400/90';
  }
  if (severityUpper === 'S3' || severityUpper === 'P3') {
    return 'bg-amber-400 text-amber-950 border-amber-700 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-500/80';
  }
  if (severityUpper === 'S4' || severityUpper === 'P4') {
    return 'bg-gray-500 text-white border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-500';
  }
  return 'bg-gray-500 text-white border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-500';
}
