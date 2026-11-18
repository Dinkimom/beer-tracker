import type { Locator, Page } from '@playwright/test';

import fs from 'node:fs';
import path from 'node:path';

import { collectFindings } from '../audit/detectors';
import { en, expect, openDemoPlanner, openSprintTab, test, type Theme } from '../fixtures';
import { plannedCard } from '../swimlane';

/**
 * Тур состояний для агентского аудита интерфейса (скилл ui-audit): доводит демо до состояний, которые не видны
 * на экранах по умолчанию (меню, окна, композеры, пустые результаты, узкое окно), и в каждом снимает кадр и
 * находки детекторов. Не проверка — материал для разбора глазами; в CI не идёт (`E2E_TOUR=1`, `pnpm e2e:tour`).
 *
 * Выход: e2e/.results/tour/<тема>/<состояние>.png и .findings.json. UI английский, как во всех e2e:
 * непереведённые строки ловит детектор `i18n:untranslated`.
 * Новое состояние — запись в STATES: как дойти и что должно открыться.
 */
test.skip(!process.env.E2E_TOUR, 'тур — только по запросу: pnpm e2e:tour');
test.use({ frozenClock: true });
test.setTimeout(90_000);

interface TourState {
  name: string;
  /** Ширина окна, если не стандартная (1680). */
  width?: number;
  /** Довести до состояния; вернуть элемент, который должен быть виден, когда состояние открылось. */
  reach(page: Page): Locator | Promise<Locator>;
}

const nav = (page: Page) => page.getByRole('navigation', { name: en.header.accessibility.sprintTabsNavigation });
/** Кнопка вне шапки: у сайдбара и шапки есть одноимённые («Metrics»). */
const sidebarButton = (page: Page, name: RegExp) => page.locator('button:not(nav *)').filter({ hasText: name });

const STATES: TourState[] = [
  { name: 'board', reach: (page) => page.getByRole('button', { name: en.sprintPlanner.controls.viewByAssignees }) },
  {
    name: 'board-narrow',
    reach: (page) => page.getByRole('button', { name: en.sprintPlanner.controls.viewByAssignees }),
    width: 1280,
  },
  {
    name: 'board-context-menu',
    reach: async (page) => {
      await plannedCard(page, 'DEMO-107').click({ button: 'right' });
      return page.getByRole('button', { name: en.sprintPlanner.contextMenu.taskInfo });
    },
  },
  {
    name: 'board-task-info',
    reach: async (page) => {
      await plannedCard(page, 'DEMO-107').click({ button: 'right' });
      await page.getByRole('button', { name: en.sprintPlanner.contextMenu.taskInfo }).click();
      return page.getByRole('complementary', { name: en.sprintPlanner.taskInfo.title });
    },
  },
  {
    name: 'board-search-empty',
    reach: async (page) => {
      await page.getByPlaceholder(en.sprintPlanner.controls.searchPlaceholder).fill('zzz-no-such-task');
      return page.getByPlaceholder(en.sprintPlanner.controls.searchPlaceholder);
    },
  },
  {
    name: 'board-sprint-select',
    reach: async (page) => {
      await page.getByRole('button', { name: /13\.10 - 24\.10/ }).first().click();
      return page.getByRole('dialog').first();
    },
  },
  {
    name: 'board-mode-select',
    reach: async (page) => {
      await page.getByRole('button', { name: en.sprintPlanner.controls.viewByAssignees }).click();
      return page.getByRole('dialog').getByRole('button', { name: en.sprintPlanner.controls.viewKanban });
    },
  },
  {
    name: 'board-kanban',
    reach: async (page) => {
      await page.getByRole('button', { name: en.sprintPlanner.controls.viewByAssignees }).click();
      await page.getByRole('dialog').getByRole('button', { exact: true, name: en.sprintPlanner.controls.viewKanban }).click();
      return page.getByRole('heading', { exact: true, level: 3, name: 'In progress' });
    },
  },
  {
    name: 'board-features',
    reach: async (page) => {
      await page.getByRole('button', { name: en.sprintPlanner.controls.viewByAssignees }).click();
      await page.getByRole('dialog').getByRole('button', { exact: true, name: en.sprintPlanner.controls.viewByFeatures }).click();
      await expect(page.getByRole('button', { exact: true, expanded: false, name: en.sprintPlanner.controls.viewByFeatures })).toBeVisible();
      // Режим готов, когда отрисованы строки фич, а не только переключатель.
      return page.locator('[data-swimlane]').first();
    },
  },
  {
    name: 'board-sidebar-filters',
    reach: async (page) => {
      await page.getByRole('button', { name: en.sidebar.tasksTab.filtersExpandAria }).click();
      return page.getByRole('button', { name: en.sidebar.tasksTab.filtersCollapseAria });
    },
  },
  {
    name: 'board-sidebar-sprint',
    reach: async (page) => {
      await sidebarButton(page, new RegExp(`^${en.sidebar.tabs.goals}\\s*\\d+/\\d+$`)).click();
      return page.getByRole('heading', { name: en.sidebar.goalsTab.deliveryGoalsHeading });
    },
  },
  {
    name: 'board-sidebar-metrics',
    reach: async (page) => {
      await sidebarButton(page, new RegExp(`^${en.sidebar.tabs.metrics}$`)).click();
      return sidebarButton(page, new RegExp(`^${en.sidebar.tabs.metrics}$`));
    },
  },
  {
    name: 'settings',
    reach: async (page) => {
      await page.getByRole('button', { exact: true, name: en.header.actions.settings }).click();
      return page.getByRole('dialog').first();
    },
  },
  {
    name: 'backlog',
    reach: async (page) => {
      await openSprintTab(page, 'backlog');
      return page.getByRole('textbox', { name: en.backlog.filters.searchAria });
    },
  },
  {
    name: 'backlog-search-empty',
    reach: async (page) => {
      await openSprintTab(page, 'backlog');
      await page.getByRole('textbox', { name: en.backlog.filters.searchAria }).fill('zzz-no-such-task');
      return page.getByRole('textbox', { name: en.backlog.filters.searchAria });
    },
  },
  {
    name: 'roadmap',
    reach: async (page) => {
      await openSprintTab(page, 'quarter');
      return nav(page);
    },
  },
  {
    name: 'burndown',
    reach: async (page) => {
      await openSprintTab(page, 'burndown');
      return nav(page);
    },
  },
  {
    name: 'retro',
    reach: async (page) => {
      await openSprintTab(page, 'retro');
      return page.getByRole('region', { name: en.retro.boardAria });
    },
  },
  {
    name: 'retro-composer',
    reach: async (page) => {
      await openSprintTab(page, 'retro');
      const column = page.getByRole('region', { name: en.retro.presets.glad });
      await column.getByRole('button', { name: en.retro.addCard }).click();
      return column.getByRole('textbox', { name: en.retro.addCard });
    },
  },
  {
    name: 'retro-comments',
    reach: async (page) => {
      await openSprintTab(page, 'retro');
      // У карточки с комментариями кнопка подписана числом («Comments, 1»), у пустой — «Add a comment».
      await page.getByRole('region', { name: 'To discuss' }).getByRole('button', { name: /^Comments, \d+$/ }).click();
      return page.getByRole('region', { name: en.retro.boardAria });
    },
  },
  {
    name: 'retro-column-menu',
    reach: async (page) => {
      await openSprintTab(page, 'retro');
      await page.getByRole('region', { name: en.retro.presets.glad }).getByRole('button', { name: en.retro.listMenu }).click();
      return page.getByRole('region', { name: en.retro.presets.glad });
    },
  },
  {
    name: 'metrics',
    reach: async (page) => {
      await openSprintTab(page, 'metrics');
      return nav(page);
    },
  },
];

/**
 * Кадр — только в покое: курсор в угол (без следов наведения), конечные анимации и переходы доиграли.
 * Без этого меню снималось посреди fade-in (полупрозрачным), шеврон — на полпути, панели — не на месте,
 * и разбор принимал артефакт съёмки за проблему продукта. Бесконечные анимации (спиннеры) не ждём.
 */
async function settle(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
    const done = Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
    await Promise.race([done, new Promise((resolve) => setTimeout(resolve, 3000))]);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

const THEMES: Theme[] = ['light', 'dark'];
const ONLY = process.env.E2E_TOUR_ONLY?.split(',');

for (const theme of THEMES) {
  test.describe(theme, () => {
    test.use({ theme });

    for (const state of STATES.filter((s) => !ONLY || ONLY.includes(s.name))) {
      test(state.name, async ({ page }) => {
        if (state.width) await page.setViewportSize({ height: 900, width: state.width });
        await openDemoPlanner(page);
        await expect(await state.reach(page)).toBeVisible();
        await page.waitForLoadState('networkidle');
        await settle(page);

        const dir = path.join('e2e/.results/tour', theme);
        fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, `${state.name}.png`) });
        // Перекрытия в туре не пишем: в состояниях с меню, окном или панелью всё под ними перекрыто по замыслу,
        // а экраны без оверлеев проверяет аудит (e2e/audit).
        const findings = (await collectFindings(page)).filter((finding) => finding.rule !== 'covered');
        fs.writeFileSync(path.join(dir, `${state.name}.findings.json`), `${JSON.stringify(findings, null, 2)}\n`);
      });
    }
  });
}
