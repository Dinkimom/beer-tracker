import { query } from '@/lib/db';
import {
  getDbContractMode,
  isDbCompatibilityMode,
  isDbContractPreflightStrict,
} from '@/lib/env';

async function runReadPermissionProbe(probe: { name: string; sql: string }): Promise<string | null> {
  try {
    await query(probe.sql);
    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `${probe.name}: ${msg}`;
  }
}

async function runReadPermissionProbes(
  probes: Array<{ name: string; sql: string }>
): Promise<string[]> {
  const results = await Promise.all(probes.map(runReadPermissionProbe));
  return results.filter((failure): failure is string => failure != null);
}

type CheckLevel = 'error' | 'warning';

interface DbContractCheck {
  details?: string;
  level: CheckLevel;
  name: string;
  ok: boolean;
}

interface DbContractStatusReport {
  checks: DbContractCheck[];
  mode: 'compatibility' | 'native';
  ok: boolean;
  strict: boolean;
}

const REQUIRED_SCHEMAS = ['beer_tracker', 'overseer', 'public'] as const;
const REQUIRED_OVERSEER_TABLES = [
  'teams',
  'staff_teams',
  'staff_roles',
  'roles',
] as const;
const REQUIRED_PUBLIC_TABLES = ['registry_employees'] as const;

const REQUIRED_COLUMNS: Array<{
  column: string;
  schema: string;
  table: string;
}> = [
  { schema: 'overseer', table: 'teams', column: 'uid' },
  { schema: 'overseer', table: 'teams', column: 'board' },
  { schema: 'overseer', table: 'teams', column: 'queue' },
  { schema: 'public', table: 'registry_employees', column: 'uuid' },
  { schema: 'public', table: 'registry_employees', column: 'tracker_id' },
  { schema: 'public', table: 'registry_employees', column: 'name' },
  { schema: 'public', table: 'registry_employees', column: 'surname' },
];

async function checkSchemas(): Promise<DbContractCheck> {
  const res = await query<{ schema_name: string }>(
    `SELECT schema_name
     FROM information_schema.schemata
     WHERE schema_name = ANY($1::text[])`,
    [REQUIRED_SCHEMAS]
  );
  const existing = new Set(res.rows.map((r) => r.schema_name));
  const missing = REQUIRED_SCHEMAS.filter((s) => !existing.has(s));
  return {
    name: 'required_schemas',
    level: 'error',
    ok: missing.length === 0,
    details: missing.length > 0 ? `Missing schemas: ${missing.join(', ')}` : undefined,
  };
}

async function checkTables(
  schemaName: string,
  tables: readonly string[],
  checkName: string
): Promise<DbContractCheck> {
  const res = await query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_name = ANY($2::text[])`,
    [schemaName, tables]
  );
  const existing = new Set(res.rows.map((r) => r.table_name));
  const missing = tables.filter((t) => !existing.has(t));
  return {
    name: checkName,
    level: 'error',
    ok: missing.length === 0,
    details: missing.length > 0 ? `Missing ${schemaName} tables: ${missing.join(', ')}` : undefined,
  };
}

async function checkRequiredColumns(): Promise<DbContractCheck> {
  const res = await query<{
    column_name: string;
    table_name: string;
    table_schema: string;
  }>(
    `SELECT table_schema, table_name, column_name
     FROM information_schema.columns
     WHERE (table_schema, table_name, column_name) IN (
       SELECT x.schema_name, x.table_name, x.column_name
       FROM (
         VALUES
           ('overseer','teams','uid'),
           ('overseer','teams','board'),
           ('overseer','teams','queue'),
           ('public','registry_employees','uuid'),
           ('public','registry_employees','tracker_id'),
           ('public','registry_employees','name'),
           ('public','registry_employees','surname')
       ) AS x(schema_name, table_name, column_name)
     )`
  );
  const existing = new Set(
    res.rows.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`)
  );
  const missing = REQUIRED_COLUMNS.map((c) => `${c.schema}.${c.table}.${c.column}`).filter(
    (key) => !existing.has(key)
  );
  return {
    name: 'required_columns_for_compatibility',
    level: 'error',
    ok: missing.length === 0,
    details: missing.length > 0 ? `Missing columns: ${missing.join(', ')}` : undefined,
  };
}

async function checkReadPermissions(): Promise<DbContractCheck> {
  const probes: Array<{ name: string; sql: string }> = [
    { name: 'overseer.teams', sql: 'SELECT 1 FROM overseer.teams LIMIT 1' },
    {
      name: 'public.registry_employees',
      sql: 'SELECT 1 FROM public.registry_employees LIMIT 1',
    },
  ];
  const failures = await runReadPermissionProbes(probes);
  return {
    name: 'compatibility_read_permissions',
    level: 'error',
    ok: failures.length === 0,
    details: failures.length > 0 ? failures.join(' | ') : undefined,
  };
}

export async function collectDbContractStatusReport(): Promise<DbContractStatusReport> {
  const mode = getDbContractMode();
  const strict = isDbContractPreflightStrict();
  if (!isDbCompatibilityMode()) {
    return {
      mode,
      strict,
      ok: true,
      checks: [
        {
          name: 'compatibility_checks_skipped',
          level: 'warning',
          ok: true,
          details: 'DB_CONTRACT_MODE=native',
        },
      ],
    };
  }

  const checks: DbContractCheck[] = [];
  const safePush = async (fn: () => Promise<DbContractCheck>, name: string) => {
    try {
      checks.push(await fn());
    } catch (error) {
      checks.push({
        name,
        level: 'error',
        ok: false,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  await safePush(checkSchemas, 'required_schemas');
  await safePush(
    () => checkTables('overseer', REQUIRED_OVERSEER_TABLES, 'required_overseer_tables'),
    'required_overseer_tables'
  );
  await safePush(
    () => checkTables('public', REQUIRED_PUBLIC_TABLES, 'required_public_tables'),
    'required_public_tables'
  );
  await safePush(checkRequiredColumns, 'required_columns_for_compatibility');
  await safePush(checkReadPermissions, 'compatibility_read_permissions');

  const ok = checks.every((c) => c.ok || c.level !== 'error');
  return { mode, strict, ok, checks };
}

export async function runDbContractPreflightOnStartup(): Promise<void> {
  const report = await collectDbContractStatusReport();
  if (report.mode !== 'compatibility') {
    return;
  }
  if (report.ok) {
    console.warn('[db-contract] compatibility preflight passed');
    return;
  }
  const details = report.checks
    .filter((c) => !c.ok)
    .map((c) => `${c.name}: ${c.details ?? 'failed'}`)
    .join(' | ');
  const message = `[db-contract] compatibility preflight failed: ${details}`;
  if (report.strict) {
    throw new Error(message);
  }
  console.warn(message);
}
