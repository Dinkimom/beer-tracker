import { test as base, expect, type Locator, type Page } from '@playwright/test';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { enMessages } from '@/lib/i18n/messages/en';
import { ruMessages } from '@/lib/i18n/messages/ru';

/**
 * Подписи интерфейса берём из словаря, а не пишем строками: переименование в словаре не ломает тест,
 * а пропавший ключ ломает typecheck. Функциональные спеки — на английском (`en`); тур и аудит идут
 * на языке теста (`language`) и берут подписи через `uiOf(page)`.
 */
export const en = enMessages;

export type Theme = 'dark' | 'light';
export type Language = 'en' | 'ru';
/** Форма словаря без литеральных типов листьев: `en` и `ru` — один тип. */
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
type Messages = Widen<typeof enMessages>;

const MESSAGES: Record<Language, Messages> = { en: enMessages, ru: ruMessages };
const uiByPage = new WeakMap<Page, Messages>();
const fixtureByPage = new WeakMap<Page, DemoFixture>();

/** Вариант данных демо: обычная фикстура или стресс (`lib/demo/demoFixtureStress.ts`). */
export type DemoFixture = 'default' | 'stress';

/** Словарь языка, на котором открыта страница теста. */
export function uiOf(page: Page): Messages {
  return uiByPage.get(page) ?? enMessages;
}

interface DemoOptions {
  /** Данные демо. `stress` — длинные названия, много людей и задач, задачи без оценок. */
  demoFixture: DemoFixture;
  /**
   * Заморозить `Date.now()` браузера на «сейчас» демо. Часы планера демо заморожены и так (`DEMO_PLANNER_NOW`),
   * а это — для остального UI («2 часа назад», текущий квартал). Таймеры идут как обычно.
   */
  frozenClock: boolean;
  /** Язык интерфейса. По умолчанию английский; русский — у проекта `audit-ru` и у тура с `E2E_LANG=ru`. */
  language: Language;
  /** Дополнительные ключи localStorage поверх базовых (значения кладутся через JSON.stringify). */
  storage: Record<string, unknown>;
  theme: Theme;
}

const DEMO_PATH = '/demo/planner';
/** `DEMO_PLANNER_NOW` из lib/demo/demoIds.ts — локальный полдень 16.10.2026 в часовом поясе браузера (playwright.config). */
const DEMO_NOW = new Date('2026-10-16T12:00:00+03:00');

/**
 * `page` с подготовленным демо: язык, тема, пройденный онбординг; падает в конце теста,
 * если браузер написал в консоль ошибку, бросил необработанное исключение или получил ответ 4xx/5xx.
 * Состояние демо живёт в памяти вкладки — у каждого теста свой контекст и чистая фикстура.
 */
export const test = base.extend<DemoOptions>({
  frozenClock: [false, { option: true }],
  demoFixture: ['default', { option: true }],
  language: ['en', { option: true }],
  page: async ({ demoFixture, frozenClock, language, page, storage, theme }, provide) => {
    if (frozenClock) await page.clock.setFixedTime(DEMO_NOW);
    uiByPage.set(page, MESSAGES[language]);
    fixtureByPage.set(page, demoFixture);
    const entries = {
      [STORAGE_KEYS.LANGUAGE]: language,
      [STORAGE_KEYS.PLANNER_ONBOARDING]: { tourCompleted: true },
      [STORAGE_KEYS.THEME]: theme,
      ...storage,
    };
    await page.addInitScript((values) => {
      for (const [key, value] of Object.entries(values)) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    }, entries);

    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('response', (response) => {
      if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`);
    });

    await provide(page);

    expect(problems, 'ни ошибок в консоли браузера, ни ответов 4xx/5xx').toEqual([]);
  },
  storage: [{}, { option: true }],
  theme: ['light', { option: true }],
});

export { expect };

/** Открывает демо-планер и ждёт, пока доска отрисуется. */
export async function openDemoPlanner(page: Page): Promise<void> {
  await page.goto(fixtureByPage.get(page) === 'stress' ? `${DEMO_PATH}?fixture=stress` : DEMO_PATH);
  // Плашка Next.js Dev Tools есть только у dev-сервера — в кадр и под клики не идёт.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await expect(sprintTab(page, 'board')).toHaveAttribute('aria-current', 'page');
  await page.waitForLoadState('networkidle');
  await expectNoLoadingOverlay(page);
}

/**
 * Полноэкранный оверлей загрузки (`LoadingOverlayView`) может висеть поверх уже отрисованного экрана:
 * маркер экрана виден, а кликнуть и снять снимок ещё нельзя.
 */
async function expectNoLoadingOverlay(page: Page): Promise<void> {
  await expect(page.locator('[role="status"][aria-busy="true"]')).toHaveCount(0);
}

type SprintTabKey = 'backlog' | 'board' | 'burndown' | 'metrics' | 'quarter' | 'retro';

/** Кнопка вкладки в шапке планера. */
function sprintTab(page: Page, key: SprintTabKey): Locator {
  const ui = uiOf(page);
  return page
    .getByRole('navigation', { name: ui.header.accessibility.sprintTabsNavigation })
    .getByRole('button', { exact: true, name: ui.header.sprintTabs[key] });
}

/** Элемент, который есть только на экране вкладки: по нему видно, что экран открылся и загрузился. */
const SCREEN_MARKERS: Record<SprintTabKey, (page: Page) => Locator> = {
  backlog: (page) => page.getByRole('textbox', { name: uiOf(page).backlog.filters.searchAria }),
  board: (page) => page.getByRole('button', { name: uiOf(page).sprintPlanner.controls.viewByAssignees }),
  burndown: (page) => page.getByRole('heading', { name: uiOf(page).burndown.metrics.storyPointsTitle }).first(),
  metrics: (page) => page.getByRole('button', { name: uiOf(page).sprintMetrics.actions.exportCsv }),
  quarter: (page) => page.getByRole('button', { name: uiOf(page).quarterlyPlan.previousQuarter }),
  retro: (page) => page.getByRole('region', { name: uiOf(page).retro.boardAria }),
};

export const SPRINT_TABS = Object.keys(SCREEN_MARKERS) as SprintTabKey[];

/** Переходит на вкладку шапки и ждёт её экран. */
export async function openSprintTab(page: Page, key: SprintTabKey): Promise<void> {
  await sprintTab(page, key).click();
  await expect(sprintTab(page, key)).toHaveAttribute('aria-current', 'page');
  await expect(SCREEN_MARKERS[key](page)).toBeVisible();
  await expectNoLoadingOverlay(page);
}
