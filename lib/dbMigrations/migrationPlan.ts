import { createHash } from 'crypto';

/** `0001_baseline.sql`: четыре цифры порядка, затем имя в snake_case. */
const MIGRATION_FILE_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/;

export interface MigrationFile {
  checksum: string;
  name: string;
  sql: string;
}

export interface AppliedMigration {
  checksum: string;
  name: string;
}

interface MigrationPlan {
  /** Применённые файлы, текст которых с тех пор поменялся. */
  changed: string[];
  /** Ещё не применённые, по порядку имени. */
  pending: MigrationFile[];
  /** Есть в БД, но нет в коде: БД новее релиза (откат версии приложения). */
  unknown: string[];
}

export function isMigrationFileName(fileName: string): boolean {
  return MIGRATION_FILE_PATTERN.test(fileName);
}

function migrationChecksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export function toMigrationFile(fileName: string, sql: string): MigrationFile {
  return { checksum: migrationChecksum(sql), name: fileName.replace(/\.sql$/, ''), sql };
}

export function planMigrations(
  files: readonly MigrationFile[],
  applied: readonly AppliedMigration[]
): MigrationPlan {
  const appliedByName = new Map(applied.map((row) => [row.name, row.checksum]));
  const fileNames = new Set(files.map((file) => file.name));
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  return {
    changed: sorted
      .filter((file) => appliedByName.has(file.name) && appliedByName.get(file.name) !== file.checksum)
      .map((file) => file.name),
    pending: sorted.filter((file) => !appliedByName.has(file.name)),
    unknown: applied.map((row) => row.name).filter((name) => !fileNames.has(name)),
  };
}
