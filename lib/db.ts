/**
 * Подключение к PostgreSQL для сущностей beer-tracker.
 * Параметры — `POSTGRES_*` / `PG*` (`getPostgresConfig`). В SQL — схема `beer_tracker.*`.
 */

import type { QueryParams } from '@/types';

import { type QueryResult, type QueryResultRow, Pool } from 'pg';

import { retryPreparedStatementQuery } from './dbQueryRetryHelpers';
import { getBeerTrackerSchema, getPostgresConfig } from './env';

const config = getPostgresConfig();

const DEFAULT_POOL_MAX = 10;
/**
 * Потолок на процесс: защита от дублей модуля (HMR / standalone), не лимит SSE.
 * Раньше 3 слота не хватало: handshake realtime и запросы планера стояли в очереди,
 * четвёртый зритель спринта не попадал в presence и не получал события.
 */
const ABSOLUTE_POOL_MAX = 20;
const DEFAULT_POOL_MIN = 0;
const DEFAULT_POOL_IDLE_MS = 10_000;
const DEFAULT_POOL_CONNECT_MS = 15_000;

function parsePoolInt(raw: string | undefined, fallback: number, minValue: number): number {
  const parsed = parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < minValue) {
    return fallback;
  }
  return parsed;
}

function createPool() {
  const requested = parsePoolInt(process.env.DB_POOL_MAX, DEFAULT_POOL_MAX, 1);
  const max = Math.min(requested, ABSOLUTE_POOL_MAX);
  const min = Math.min(parsePoolInt(process.env.DB_POOL_MIN, DEFAULT_POOL_MIN, 0), max);
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max,
    min,
    idleTimeoutMillis: parsePoolInt(process.env.DB_POOL_TIMEOUT, DEFAULT_POOL_IDLE_MS, 1_000),
    connectionTimeoutMillis: DEFAULT_POOL_CONNECT_MS,
    statement_timeout: 10_000,
  } as never);
}

// Next.js HMR (dev) и дубли чанков (production standalone) переоценивают модуль
// и иначе создают несколько Pool на процесс → too many connections на роли PG.
const globalForPool = globalThis as typeof globalThis & { __beerTrackerPool?: Pool };
const pool: Pool = globalForPool.__beerTrackerPool ?? createPool();
globalForPool.__beerTrackerPool = pool;

pool.on('error', (err) => {
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  const isPreparedStatementMissing =
    message.includes('prepared statement') && message.includes('does not exist');
  if (isPreparedStatementMissing) {
    return;
  }
  console.error('Unexpected error on idle client', err);
});

const BEER_TRACKER_TABLES = [
  'admins',
  'analytics_events',
  'comment_reactions',
  'comments',
  'issue_changelog_events',
  'issue_snapshots',
  'occupancy_task_order',
  'organization_secrets',
  'planner_files',
  'organizations',
  'org_roles',
  'quarterly_plan_v2_epics',
  'quarterly_plan_v2_excluded_stories',
  'quarterly_plan_v2_story_events',
  'quarterly_plan_v2_story_phases',
  'quarterly_plans',
  'sprint_feature_lanes', // доска «по фичам»: черновые строки и порядок
  'sprint_goals',
  'staff',
  'system_roles',
  'sync_runs',
  'task_links',
  'task_position_segments',
  'task_positions',
  'team_members',
  'teams',
  'user_notifications',
  'board_availability_events',
] as const;

function schemaQualified(): string {
  const s = getBeerTrackerSchema();
  return s.includes('-') ? `"${s}"` : s;
}

/** Подставляет схему перед таблицами beer_tracker (для использования в query и при ручном `pool.connect`). */
export function qualifyBeerTrackerTables(sql: string): string {
  const schema = schemaQualified();
  let out = sql;
  for (const table of BEER_TRACKER_TABLES) {
    out = out.replace(
      new RegExp(`\\b(FROM|INTO|UPDATE|JOIN|REFERENCES|ALTER TABLE|USING)\\s+${table}\\b`, 'gi'),
      `$1 ${schema}.${table}`
    );
  }
  return out;
}

export { pool };

/** Одна транзакция на выделенном соединении из пула (все запросы — одна сессия). */
export async function runBeerTrackerTransaction<T>(
  fn: (tx: (sql: string, params?: QueryParams) => Promise<void>) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = async (sql: string, params?: QueryParams) => {
      await client.query(qualifyBeerTrackerTables(sql), params);
    };
    try {
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } finally {
    client.release();
  }
}

/** T — тип строки результата; по умолчанию any, чтобы существующие маршруты не ломали вывод типов. */
export async function query<T extends QueryResultRow = any>( // eslint-disable-line @typescript-eslint/no-explicit-any -- см. комментарий выше
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const sql = qualifyBeerTrackerTables(text);
  const run = () => pool.query<T>(sql, params);
  return await retryPreparedStatementQuery(run, run, 2);
}
