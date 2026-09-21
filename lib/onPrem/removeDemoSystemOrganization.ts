import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';
import {
  DEMO_SYSTEM_ORGANIZATION_ID,
  DEMO_SYSTEM_ORGANIZATION_SLUG,
} from '@/lib/onPrem/demoSystemOrganizationConstants';

/**
 * Удаляет системную демо-организацию из БД (сид init.sql).
 * Иначе `hasOrganizations` остаётся true без пользователей — ломается онбординг первого администратора.
 */
function qualifiedOrganizationsTable(): string {
  const s = getBeerTrackerSchema();
  return s.includes('-') ? `"${s}".organizations` : `${s}.organizations`;
}

export async function removeDemoSystemOrganizationForOnPrem(): Promise<void> {
  const res = await query(
    `DELETE FROM ${qualifiedOrganizationsTable()}
     WHERE id = $1::uuid OR slug = $2`,
    [DEMO_SYSTEM_ORGANIZATION_ID, DEMO_SYSTEM_ORGANIZATION_SLUG]
  );
  if ((res.rowCount ?? 0) > 0) {
    console.warn(
      `[onprem] Удалена демо-организация (${DEMO_SYSTEM_ORGANIZATION_SLUG}) — в self-hosted она не используется.`
    );
  }
}
