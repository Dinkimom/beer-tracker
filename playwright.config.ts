import { defineConfig } from '@playwright/test';

/**
 * Регресс-набор на `/demo/planner` (фикстуры, замороженные часы, без логина).
 * Функциональные спеки — `e2e/functional`, визуальные — `e2e/visual` (эталоны снимаются только в Linux-образе
 * Playwright: `pnpm e2e:visual`). Как запускать и разбирать падения — docs/AGENT_TESTING_GUIDE.md и скилл `regress`.
 *
 * Сервер: по умолчанию уже запущенный dev-сервер (`E2E_BASE_URL`, иначе http://localhost:3000).
 * `E2E_START_SERVER=1` (CI) — поднять свой dev-сервер. Именно dev, не production-сборку: эталоны снимаются
 * против dev-сервера, а `removeConsole` в production вырезает console.error, который ловит фикстура.
 * Демо работает без БД и трекера.
 */
const isCi = Boolean(process.env.CI);
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

/** Опции фикстуры `e2e/fixtures.ts`, которые задаются на уровне проекта. */
interface ProjectOptions {
  demoFixture: 'default' | 'stress';
  language: 'en' | 'ru';
}

export default defineConfig<ProjectOptions>({
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      // Прогоны в одном образе детерминированы (48/48 без единого пикселя разницы). Любой допуск по площади
      // прячет регресс: переименование вкладки «Roadmap» → «Road map» сдвигает ~0,1% кадра и проходило при 0,2%.
      // Цветовой допуск на пиксель (`threshold`) — по умолчанию.
      maxDiffPixels: 0,
      scale: 'css',
    },
  },
  forbidOnly: isCi,
  fullyParallel: true,
  outputDir: 'e2e/.results/artifacts',
  projects: [
    { name: 'functional', testDir: 'e2e/functional' },
    { name: 'visual', testDir: 'e2e/visual' },
    { name: 'audit', testDir: 'e2e/audit' },
    // Русский длиннее английского: обрезка и переносы прячутся в нём; плюс английские фразы мимо перевода.
    { name: 'audit-ru', testDir: 'e2e/audit', use: { language: 'ru' } },
    // Неудобные данные (длинные названия, много людей, нет оценок) на самом длинном языке.
    { name: 'audit-ru-stress', testDir: 'e2e/audit', use: { demoFixture: 'stress', language: 'ru' } },
    // Материал для скилла ui-audit, не проверка: только с E2E_TOUR=1 (pnpm e2e:tour).
    { name: 'tour', testDir: 'e2e/tour' },
  ],
  reporter: [
    [isCi ? 'github' : 'list'],
    ['html', { open: 'never', outputFolder: 'e2e/.results/report' }],
    // Машиночитаемый итог для агента (скилл regress): статусы, ретраи, пути к expected/actual/diff.
    ['json', { outputFile: 'e2e/.results/results.json' }],
  ],
  retries: isCi ? 1 : 0,
  // Одинаковый путь эталона на любой ОС: снимки валидны только из Linux-образа, см. e2e/visual.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  testDir: 'e2e',
  // Сервер — dev: первый HTML страницы рендерится на лету, под 4+ параллельными браузерами ответ доходит
  // до 20–30 с (по trace — висел сам документ, не тест). 30 с по умолчанию на тест мало.
  timeout: 60_000,
  use: {
    baseURL,
    deviceScaleFactor: 1,
    locale: 'en-US',
    screenshot: 'only-on-failure',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    viewport: { height: 1050, width: 1680 },
  },
  webServer: process.env.E2E_START_SERVER
    ? {
        command: `pnpm dev:skip-lint --port ${port}`,
        env: { DB_MIGRATIONS_AUTO: 'false' },
        reuseExistingServer: false,
        timeout: 180_000,
        url: `${baseURL}/demo/planner`,
      }
    : undefined,
  workers: isCi ? 2 : undefined,
});
