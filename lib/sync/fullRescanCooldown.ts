/**
 * Cooldown между запросами full_rescan (админский API).
 */

export function fullRescanCooldownRemainingMs(params: {
  cooldownMinutes: number;
  lastFullRescanFinishedAt: Date | null;
  now: Date;
}): number {
  if (params.cooldownMinutes <= 0) {
    return 0;
  }
  if (params.lastFullRescanFinishedAt == null) {
    return 0;
  }
  const end =
    params.lastFullRescanFinishedAt.getTime() +
    params.cooldownMinutes * 60_000;
  return Math.max(0, end - params.now.getTime());
}
