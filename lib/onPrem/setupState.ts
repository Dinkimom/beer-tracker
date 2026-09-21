import { ensureAdminsTable } from '@/lib/auth/adminsRepository';
import { query } from '@/lib/db';

interface OnPremSetupState {
  hasAdmins: boolean;
  hasOrganizations: boolean;
  /**
   * Есть хотя бы один админ продукта (`beer_tracker.admins`).
   * Не путать с «в БД есть строка organizations»: без админа онбординг ещё не завершён.
   */
  initialized: boolean;
}

interface SetupStateRow {
  has_admins: boolean;
  has_organizations: boolean;
}

export async function readOnPremSetupState(): Promise<OnPremSetupState> {
  await ensureAdminsTable();
  const res = await query<SetupStateRow>(
    `SELECT
       EXISTS(SELECT 1 FROM organizations) AS has_organizations,
       EXISTS(SELECT 1 FROM admins) AS has_admins`
  );
  const row = res.rows[0];
  const hasOrganizations = Boolean(row?.has_organizations);
  const hasAdmins = Boolean(row?.has_admins);
  return {
    hasAdmins,
    hasOrganizations,
    initialized: hasAdmins,
  };
}
