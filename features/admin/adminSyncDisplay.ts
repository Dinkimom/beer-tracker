/** Human-readable labels for sync/status API responses (no API change). */

type AdminSyncTranslate = (
  key: string,
  params?: Record<string, number | string>,
) => string;

export function formatSyncRunStatus(
  status: string,
  t: AdminSyncTranslate,
  has: (key: string) => boolean,
): string {
  const key = `admin.syncProgress.runStatus.${status}`;
  return has(key) ? t(key) : status;
}

export function formatSyncJobType(
  jobType: string | null,
  t: AdminSyncTranslate,
  has: (key: string) => boolean,
): string | null {
  if (jobType == null || jobType === "") {
    return null;
  }
  const key = `admin.syncProgress.jobType.${jobType}`;
  return has(key) ? t(key) : jobType;
}

/** Tailwind classes for the status word in the last-run line. */
export function syncRunStatusWordClass(status: string): string {
  switch (status) {
    case "failed":
      return "text-red-600 dark:text-red-400";
    case "partial":
      return "text-amber-800 dark:text-amber-200";
    case "running":
      return "text-blue-700 dark:text-blue-300";
    case "skipped":
      return "text-gray-600 dark:text-gray-400";
    case "success":
      return "text-green-700 dark:text-green-400";
    default:
      return "text-gray-700 dark:text-gray-300";
  }
}
