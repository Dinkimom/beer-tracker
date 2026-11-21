import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Номера спринтов у трекеров пересекаются между организациями: у двух организаций может быть спринт 42.
 * Поэтому любой запрос к таблице, где есть и `organization_id`, и `sprint_id`, обязан ограничивать
 * организацию — явно или через общий фрагмент WHERE (`sprintTenantWhere()` и производные от него).
 */

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = ['lib', 'app', 'apps'];

/** Фрагменты SQL, которые уже ограничивают организацию (см. `lib/sprints/sprintTenantSql.ts`). */
const SCOPED_FRAGMENTS = [
  '${sprintTenantWhere()}',
  '${scopeSql}',
  '${DRAFT_SCOPE}',
  '${TASK_POSITIONS_INSERT_COLUMNS}',
];

/** Осознанные исключения: файл и начало запроса → почему организация не нужна. */
const ALLOWED: ReadonlyArray<{ file: string; reason: string; sqlStart: string }> = [
  {
    file: 'lib/sprints/sprintPlanPatchAppliedTokenRepository.ts',
    reason: 'уборка просроченных токенов всех организаций',
    sqlStart: 'DELETE FROM plan_patch_applied_tokens WHERE expires_at < CURRENT_TIMESTAMP',
  },
  {
    file: 'lib/agentSessions/agentSessionsRepository.ts',
    reason: 'по UUID-ключу сессии, уже загруженной getAgentSession с фильтром организации и владельца',
    sqlStart: 'UPDATE agent_sessions SET',
  },
];

function isAllowed(file: string, sql: string): boolean {
  return ALLOWED.some((entry) => entry.file === file && sql.startsWith(entry.sqlStart));
}

function sprintScopedTables(): string[] {
  const dir = path.join(ROOT, 'database/migrations');
  const sql = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(path.join(dir, name), 'utf8'))
    .join('\n');
  const tables: string[] = [];
  for (const match of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const body = match[2]!;
    if (/\borganization_id\b/.test(body) && /\bsprint_id\b/.test(body)) {
      tables.push(match[1]!);
    }
  }
  return tables;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function isScoped(sql: string): boolean {
  return sql.includes('organization_id') || SCOPED_FRAGMENTS.some((fragment) => sql.includes(fragment));
}

/** Строковые литералы файла с запросом к таблицам доски без ограничения организации. */
function unscopedInFile(file: string, tablePattern: RegExp): string[] {
  const source = readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  const found: string[] = [];
  for (const match of source.matchAll(/`([^`]*)`|'([^'\n]*)'/g)) {
    const sql = match[1] ?? match[2] ?? '';
    const isQuery = /\b(?:SELECT|UPDATE|DELETE|INSERT)\b/.test(sql) && tablePattern.test(sql);
    const flat = sql.replace(/\s+/g, ' ').trim();
    if (!isQuery || isScoped(sql) || isAllowed(relative, flat)) continue;
    const line = source.slice(0, match.index).split('\n').length;
    found.push(`${relative}:${line}  ${flat.slice(0, 100)}`);
  }
  return found;
}

function unscopedStatements(tables: readonly string[]): string[] {
  const tablePattern = new RegExp(`\\b(?:FROM|UPDATE|JOIN|INTO)\\s+(?:${tables.join('|')})\\b`);
  return SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(ROOT, dir))).flatMap((file) =>
    unscopedInFile(file, tablePattern)
  );
}

describe('SQL against sprint board tables is scoped to the organization', () => {
  const tables = sprintScopedTables();

  it('finds the sprint board tables in migrations', () => {
    expect(tables).toEqual(expect.arrayContaining(['comments', 'sprint_goals', 'task_links', 'task_positions']));
  });

  it('every statement filters by organization_id', () => {
    expect(unscopedStatements(tables)).toEqual([]);
  });
});
