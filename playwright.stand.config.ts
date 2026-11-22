import { defineConfig } from '@playwright/test';

/**
 * Стенд регресса на встроенном трекере otorva (`pnpm e2e:stand`, scripts/e2e/stand.sh): пустые база планера
 * и otorva, настоящий вход, настоящая запись в трекер. Спеки — `e2e/stand`, по порядку: онбординг создаёт
 * организацию и первого админа otorva, сид наполняет трекер из фикстур демо, дальше — сценарии планера.
 * Состояние общее (одна база на прогон), поэтому один воркер и без ретраев: упавший шаг ломает следующие.
 */
const port = Number(process.env.E2E_STAND_PORT ?? 3100);

export default defineConfig({
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: 'e2e/.results/stand/artifacts',
  projects: [
    { name: 'stand-onboarding', testMatch: 'onboarding.spec.ts' },
    {
      dependencies: ['stand-onboarding'],
      name: 'stand',
      testIgnore: 'onboarding.spec.ts',
      use: { storageState: 'e2e/.results/stand/admin-state.json' },
    },
  ],
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { open: 'never', outputFolder: 'e2e/.results/stand/report' }],
  ],
  retries: 0,
  testDir: 'e2e/stand',
  // Dev-сервер компилирует страницы при первом заходе: первый экран планера — до полуминуты.
  timeout: 120_000,
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'ru-RU',
    screenshot: 'only-on-failure',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    viewport: { height: 1050, width: 1680 },
  },
  workers: 1,
});
