/**
 * Раннер миграций схемы: `database/migrations/NNNN_*.sql` по порядку имени, каждый файл —
 * одна транзакция с `search_path = BEER_TRACKER_SCHEMA`. Учёт — таблица `schema_migrations`
 * в той же схеме. Advisory lock не даёт двум процессам (реплики, CLI) применять одновременно.
 *
 * Запуск: при старте сервера (`instrumentation.ts`, выключается `DB_MIGRATIONS_AUTO=false`)
 * и вручную `pnpm db:migrate`. См. docs/DATABASE.md.
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { Client } from 'pg';

import { getBeerTrackerSchema, getPostgresConfig, isDbMigrationsAutoEnabled } from '@/lib/env';

import {
  type AppliedMigration,
  type MigrationFile,
  isMigrationFileName,
  planMigrations,
  toMigrationFile,
} from './migrationPlan';

const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), 'database', 'migrations');

type Log = (message: string) => void;

async function readMigrationFiles(dir: string): Promise<MigrationFile[]> {
  const names = (await readdir(dir)).filter(isMigrationFileName);
  return Promise.all(
    names.map(async (name) => toMigrationFile(name, await readFile(path.join(dir, name), 'utf8')))
  );
}

async function ensureMigrationsTable(client: Client, schemaName: string): Promise<void> {
  const schema = client.escapeIdentifier(schemaName);
  // Без CREATE SCHEMA IF NOT EXISTS: он требует права CREATE на базу, даже когда схема уже есть.
  const exists = await client.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [schemaName]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE SCHEMA ${schema}`);
  }
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
      name TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER NOT NULL
    )
  `);
}

async function applyMigration(client: Client, schema: string, file: MigrationFile): Promise<void> {
  const startedAt = Date.now();
  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query(file.sql);
    await client.query(
      `INSERT INTO ${schema}.schema_migrations (name, checksum, duration_ms) VALUES ($1, $2, $3)`,
      [file.name, file.checksum, Date.now() - startedAt]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Migration ${file.name} failed: ${message}`, { cause: error });
  }
}

function warnAboutDrift(plan: ReturnType<typeof planMigrations>, log: Log): void {
  if (plan.changed.length > 0) {
    log(`changed after apply (not re-run): ${plan.changed.join(', ')}`);
  }
  if (plan.unknown.length > 0) {
    log(`applied in DB but missing in code (older release?): ${plan.unknown.join(', ')}`);
  }
}

export async function runDbMigrations(options: { dir?: string; log?: Log } = {}): Promise<string[]> {
  const log: Log = options.log ?? ((message) => console.warn(`[db-migrations] ${message}`));
  const files = await readMigrationFiles(options.dir ?? DEFAULT_MIGRATIONS_DIR);
  const client = new Client(getPostgresConfig());
  await client.connect();
  const schemaName = getBeerTrackerSchema();
  const schema = client.escapeIdentifier(schemaName);
  const lockKey = `beer-tracker:migrations:${schemaName}`;
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockKey]);
    await ensureMigrationsTable(client, schemaName);
    const appliedSql = `SELECT name, checksum FROM ${schema}.schema_migrations`;
    const applied = await client.query<AppliedMigration>(appliedSql);
    const plan = planMigrations(files, applied.rows);
    warnAboutDrift(plan, log);
    for (const file of plan.pending) {
      await applyMigration(client, schema, file);
      log(`applied ${file.name}`);
    }
    return plan.pending.map((file) => file.name);
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]).catch(() => undefined);
    await client.end();
  }
}

/**
 * Старт сервера (`instrumentation.ts`): схема должна быть актуальной до первого запроса.
 * Next при ошибке хука не падает, а отвечает 500 на всё, поэтому процесс завершается сам:
 * restart policy перезапустит его, когда БД станет доступна.
 */
export async function runDbMigrationsOnStartup(): Promise<void> {
  if (!isDbMigrationsAutoEnabled()) {
    return;
  }
  try {
    await runDbMigrations();
  } catch (error) {
    const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
    // Напрямую в stderr и выход после записи: console в хуке Next буферизуется и теряется при exit.
    // Промис не резолвится: остальной старт не продолжается, пока ошибка дописывается.
    await new Promise<never>(() => {
      process.stderr.write(`[db-migrations] failed, stopping the server: ${reason}\n`, () => process.exit(1));
    });
  }
}
