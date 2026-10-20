import { query } from '@/lib/db';

/**
 * Приватные драфты: превью propose_plan_patch принадлежат пользователю, от чьего имени работал агент.
 * Добавляет `owner_id` и перестраивает первичный ключ (org, sprint, owner, key) у старых таблиц.
 * Строки без владельца (`''`) остаются от прежней схемы и никому не показываются; их снимет TTL.
 */
export async function ensurePlanPatchPreviewOwnerColumn(input: {
  keyColumn: 'goal_id' | 'task_id';
  schema: string;
  table: 'plan_patch_goal_previews' | 'plan_patch_position_previews';
}): Promise<void> {
  const qualified = `${input.schema}.${input.table}`;
  await query(`ALTER TABLE ${qualified} ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255) NOT NULL DEFAULT ''`);
  const pk = await query<{ columns: string[]; name: string }>(
    `SELECT c.conname AS name,
            ARRAY(SELECT a.attname::text
                    FROM unnest(c.conkey) AS k(attnum)
                    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS columns
       FROM pg_constraint c
      WHERE c.conrelid = $1::regclass AND c.contype = 'p'`,
    [qualified]
  );
  const current = pk.rows[0];
  if (current?.columns.includes('owner_id')) {
    return;
  }
  if (current) {
    await query(`ALTER TABLE ${qualified} DROP CONSTRAINT "${current.name}"`);
  }
  await query(
    `ALTER TABLE ${qualified} ADD PRIMARY KEY (organization_id, sprint_id, owner_id, ${input.keyColumn})`
  );
}
