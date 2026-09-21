/**
 * Object key for planner files: `{prefix}orgs/{organizationId}/planner/{fileId}`.
 */
export function buildPlannerObjectKey(
  organizationId: string,
  fileId: string,
  keyPrefix = ''
): string {
  return `${keyPrefix}orgs/${organizationId}/planner/${fileId}`;
}
