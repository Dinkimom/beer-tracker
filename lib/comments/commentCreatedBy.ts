import { parseRegistryUuidString } from '@/lib/registryUuidString';

/**
 * `created_by` в comments/planner_files — UUID (nullable).
 * On-prem без cookie сессии даёт `onprem-anonymous` в tenant context — в колонку писать нельзя.
 */
export function resolveCommentCreatedBy(raw: string | null | undefined): string | null {
  return parseRegistryUuidString(raw);
}
