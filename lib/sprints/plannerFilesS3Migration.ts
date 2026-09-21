/** True when `planner_files` still has BYTEA `data` and must be wiped onto S3 keys. */
export function shouldWipePlannerFilesForS3Migration(
  columnNames: readonly string[]
): boolean {
  return columnNames.includes('data');
}

export function plannerFilesNeedsStorageKey(columnNames: readonly string[]): boolean {
  return !columnNames.includes('storage_key');
}

/** Гонка `CREATE INDEX IF NOT EXISTS` в двух параллельных запросах. */
export function isIgnorableConcurrentIndexError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  const code = (error as { code?: string }).code;
  if (code === '42P07') {
    return true;
  }
  const detail = (error as { detail?: string }).detail ?? '';
  return code === '23505' && detail.includes('idx_planner_files_storage_key');
}
