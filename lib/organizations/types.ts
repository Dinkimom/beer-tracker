/**
 * Строки таблиц tenant-ядра (organizations, organization_members).
 */

export type OrgMemberRole = 'member' | 'org_admin' | 'team_lead';

export interface OrganizationRow {
  created_at: Date;
  id: string;
  initial_sync_completed_at: Date | null;
  name: string;
  settings: Record<string, unknown>;
  slug: string | null;
  sync_next_run_at: Date | null;
  /** DB: `tracker_org_id` — внешний org/workspace id issue tracker provider. */
  tracker_org_id: string;
  updated_at: Date;
}

export interface OrganizationMemberRow {
  created_at: Date;
  id: string;
  organization_id: string;
  role: OrgMemberRole;
  user_id: string;
}

/** Организации пользователя (сессия / выбор tenant). */
export interface UserOrganizationSummary {
  /** Клиентская админка: org_admin или руководитель команды (после enrich). */
  canAccessAdmin?: boolean;
  /** Доступ к планеру: org_admin или есть команда (после enrich). */
  canUsePlanner?: boolean;
  initial_sync_completed_at: Date | null;
  /**
   * Команды под управлением тимлида. `null` — org_admin (все команды); `[]` — нет роли тимлида.
   */
  managedTeamIds?: string[] | null;
  name: string;
  organization_id: string;
  role: OrgMemberRole;
  slug: string | null;
}
