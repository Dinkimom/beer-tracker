function assertSyncIntervalBounds(
  minIntervalMinutes: number,
  maxIntervalMinutes: number,
  defaultIntervalMinutes: number
): void {
  if (minIntervalMinutes > maxIntervalMinutes) {
    throw new Error('SYNC_MIN_INTERVAL_MINUTES must be <= SYNC_MAX_INTERVAL_MINUTES');
  }
  if (defaultIntervalMinutes < minIntervalMinutes || defaultIntervalMinutes > maxIntervalMinutes) {
    throw new Error('SYNC_DEFAULT_INTERVAL_MINUTES must be within min/max interval bounds');
  }
}

function assertSyncOverlapBounds(input: {
  cronTickMinutes: number;
  defaultOverlapMinutes: number;
  maxOverlapMinutes: number;
  minOverlapMinutes: number;
}): void {
  const { cronTickMinutes, defaultOverlapMinutes, maxOverlapMinutes, minOverlapMinutes } = input;
  if (minOverlapMinutes > maxOverlapMinutes) {
    throw new Error('SYNC_MIN_OVERLAP_MINUTES must be <= SYNC_MAX_OVERLAP_MINUTES');
  }
  if (defaultOverlapMinutes < minOverlapMinutes || defaultOverlapMinutes > maxOverlapMinutes) {
    throw new Error('SYNC_DEFAULT_OVERLAP_MINUTES must be within min/max overlap bounds');
  }
  if (minOverlapMinutes <= cronTickMinutes) {
    throw new Error('SYNC_MIN_OVERLAP_MINUTES must be greater than SYNC_CRON_TICK_MINUTES');
  }
  if (defaultOverlapMinutes <= cronTickMinutes) {
    throw new Error('SYNC_DEFAULT_OVERLAP_MINUTES must be greater than SYNC_CRON_TICK_MINUTES');
  }
}

function assertSyncIssuesBounds(input: {
  defaultMaxIssuesPerRun: number;
  fullSyncMaxIssuesPerRun: number;
  maxMaxIssuesPerRun: number;
  minMaxIssuesPerRun: number;
}): void {
  const { defaultMaxIssuesPerRun, fullSyncMaxIssuesPerRun, maxMaxIssuesPerRun, minMaxIssuesPerRun } = input;
  if (minMaxIssuesPerRun > maxMaxIssuesPerRun) {
    throw new Error('SYNC_MIN_MAX_ISSUES_PER_RUN must be <= SYNC_MAX_MAX_ISSUES_PER_RUN');
  }
  if (defaultMaxIssuesPerRun < minMaxIssuesPerRun || defaultMaxIssuesPerRun > maxMaxIssuesPerRun) {
    throw new Error('SYNC_DEFAULT_MAX_ISSUES_PER_RUN must be within min/max issues-per-run bounds');
  }
  if (fullSyncMaxIssuesPerRun < minMaxIssuesPerRun) {
    throw new Error('SYNC_FULL_SYNC_MAX_ISSUES_PER_RUN must be >= SYNC_MIN_MAX_ISSUES_PER_RUN');
  }
}

export function assertSyncPlatformEnvBounds(input: {
  cronTickMinutes: number;
  defaultIntervalMinutes: number;
  defaultMaxIssuesPerRun: number;
  defaultOverlapMinutes: number;
  fullSyncMaxIssuesPerRun: number;
  maxIntervalMinutes: number;
  maxMaxIssuesPerRun: number;
  maxOverlapMinutes: number;
  minIntervalMinutes: number;
  minMaxIssuesPerRun: number;
  minOverlapMinutes: number;
}): void {
  assertSyncIntervalBounds(input.minIntervalMinutes, input.maxIntervalMinutes, input.defaultIntervalMinutes);
  assertSyncOverlapBounds(input);
  assertSyncIssuesBounds(input);
}
