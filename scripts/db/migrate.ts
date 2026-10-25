/**
 * Ручной прогон миграций схемы: `pnpm db:migrate`.
 * Подключение — те же `POSTGRES_*` / `PG*` и `BEER_TRACKER_SCHEMA`, что у приложения; `.env` подхватывается, если есть.
 */
import process from 'node:process';

import { runDbMigrations } from '@/lib/dbMigrations/runDbMigrations';

try {
  process.loadEnvFile();
} catch {
  // .env нет — берём переменные окружения как есть.
}

runDbMigrations({ log: (message) => process.stdout.write(`${message}\n`) })
  .then((applied) => {
    process.stdout.write(applied.length > 0 ? `Applied: ${applied.join(', ')}\n` : 'Schema is up to date\n');
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
