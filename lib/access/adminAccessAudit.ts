/**
 * Минимальный аудит отказов в админских проверках (без email и без лишнего шума).
 * @see .spec-workflow/specs/role-model/tasks.md задача 18
 */

type AdminAccessDenialTag =
  | 'admin_shell'
  | 'org_admin_profile'
  | 'planner_access'
  | 'team_management';

export function logAdminAccessDenied(
  tag: AdminAccessDenialTag,
  detail: { organizationId?: string; teamId?: string }
): void {
  try {
    const chunks = [`[admin_access_denied]`, `tag=${tag}`];
    if (detail.organizationId) {
      chunks.push(`org=${detail.organizationId}`);
    }
    if (detail.teamId) {
      chunks.push(`team=${detail.teamId}`);
    }
    console.warn(chunks.join(' '));
  } catch {
    /* ignore */
  }
}
