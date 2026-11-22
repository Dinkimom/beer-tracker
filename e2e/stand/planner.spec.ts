import type { Page } from '@playwright/test';

import fs from 'node:fs';

import { expect, test } from '@playwright/test';

import { buildDemoBacklogTasks, buildDemoSprintTasks } from '@/lib/demo/demoFixtureSeedTasks';

import { cardPlacement, dragCardToCell, plannedCard, sidebarCard, sidebarTasksTab } from '../swimlane';

import { type StandSeed, standOtorvaApi } from './seedOtorva';
import { STAND_SEED_FILE, ui } from './stand';

/**
 * Планер на встроенном трекере стенда: данные — из otorva (сид из фикстур демо), запись — в otorva и
 * базу планера. Сценарии идут по порядку на одной базе (один воркер), каждый открывает планер заново.
 */
interface OtorvaTask {
  assignee_id: string | null;
  /** Статусы, в которые можно перейти из текущего. */
  available_transitions?: { id: string; name: string }[];
  key: string;
  sprint_ids: number[];
  status_id: string;
}

const seed = (): StandSeed => JSON.parse(fs.readFileSync(STAND_SEED_FILE, 'utf8')) as StandSeed;

async function openStandPlanner(page: Page): Promise<void> {
  const { boardId, people, sprints } = seed();
  await page.goto(`/planner/${boardId}/sprint/${sprints.current}?tab=board`);
  await expect(sidebarTasksTab(page, ui.sidebar.tabs.tasks)).toBeVisible({ timeout: 60_000 });
  // Строки людей — после загрузки состава; при первом заходе поверх доски — приглашение в онбординг.
  await expect(page.locator(`[data-swimlane="${Object.values(people)[0]}"]`)).toBeVisible();
  const skip = page.getByRole('button', { name: ui.sprintPlanner.onboarding.skip });
  if (await skip.isVisible()) await skip.click();
}

/** Строка свимлейна человека фикстуры: id строки — профиль otorva из сида. */
const laneOf = (email: string): string => seed().people[email] ?? '';

/**
 * Первая ячейка первого целиком видимого дня. Часы стенда настоящие: после загрузки доска сама
 * прокручивается к сегодня — ждём, пока колонки дней не замрут, и целимся в видимое (программная
 * прокрутка двигает шапку и строки по отдельности, и жест промахивается).
 */
async function visibleDayStart(page: Page): Promise<number> {
  const read = () =>
    page.locator('[data-swimlane="__team__"]').evaluate((lane) => {
      const sticky = lane.previousElementSibling?.getBoundingClientRect().right ?? 0;
      const days = [...document.querySelectorAll<HTMLElement>('[data-onboarding-day]')];
      const first = days.find((el) => el.getBoundingClientRect().left >= sticky);
      return `${first?.dataset.onboardingDay ?? 0}@${Math.round(lane.getBoundingClientRect().left)}`;
    });
  const history: string[] = [];
  await expect
    .poll(async () => {
      history.push(await read());
      return history.length >= 3 && history.slice(-3).every((v) => v === history.at(-1));
    }, { intervals: [400] })
    .toBe(true);
  return Number(history.at(-1)?.split('@')[0]) * 3;
}

test('TC-136: задачи спринта приходят из встроенного трекера', async ({ page }) => {
  const { keys } = seed();
  await openStandPlanner(page);

  for (const task of buildDemoSprintTasks()) {
    await expect(page.locator(`[data-task-id="${keys[task.id]}"]`).first()).toBeAttached();
  }
  for (const task of buildDemoBacklogTasks()) {
    await expect(page.locator(`[data-task-id="${keys[task.id]}"]`)).toHaveCount(0);
  }
  // Статусы — из workflow otorva, ключ — текст без ссылки «открыть в трекере».
  const inProgress = sidebarCard(page, keys['DEMO-101'] ?? '').first();
  await expect(inProgress).toContainText('в работе');
  await expect(inProgress.getByRole('link')).toHaveCount(0);
});

test('TC-137: раскладка на настоящем бэкенде переживает перезагрузку', async ({ page }) => {
  const key = seed().keys['DEMO-111'] ?? '';
  await openStandPlanner(page);
  const lane = laneOf('ken@demo.local');
  const start = await visibleDayStart(page);

  // Позиция пишется в базу планера сразу после броска; перезагрузка до ответа оборвала бы запрос.
  const saved = page.waitForResponse((r) => r.url().includes('/positions') && r.request().method() === 'POST');
  await dragCardToCell(page, sidebarCard(page, key).first(), lane, start);
  await expect.poll(() => cardPlacement(page, key)).toMatchObject({ lane, start });
  expect((await saved).ok()).toBe(true);

  await page.reload();
  await expect(plannedCard(page, key).first()).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => cardPlacement(page, key)).toMatchObject({ lane, start });
});

test('TC-138: новая задача из быстрого добавления создаётся во встроенном трекере', async ({ page }) => {
  const { people, sprints } = seed();
  const quickAdd = ui.sprintPlanner.swimlane.quickAddMenu;
  const title = `Задача со стенда ${Date.now()}`;
  await openStandPlanner(page);
  const lane = laneOf('margaret@demo.local');
  const day = (await visibleDayStart(page)) / 3;

  await page
    .getByRole('toolbar')
    .getByRole('button', { name: new RegExp(`^${ui.sprintPlanner.swimlane.placementToolbar.task}`) })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    const row = await page.locator(`[data-swimlane="${lane}"]`).boundingBox();
    const column = await page.locator(`[data-onboarding-day="${day}"]`).boundingBox();
    if (!row || !column) throw new Error('нет строки или колонки дня');
    await page.mouse.move(column.x + 20, row.y + 30, { steps: 5 });
    await page.waitForTimeout(400);
    await page.mouse.down();
    await page.mouse.up();
    await expect(dialog.getByRole('menu', { name: quickAdd.modeTablist })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  await dialog.getByRole('menuitem', { name: quickAdd.modeNew }).click();
  await dialog.getByRole('textbox', { name: quickAdd.titlePlaceholder }).fill(title);
  await dialog.getByRole('button', { name: quickAdd.create }).click();
  await expect(dialog).toHaveCount(0);

  // В трекере: задача в очереди доски, в текущем спринте, на человеке строки.
  const otorva = await standOtorvaApi();
  await expect
    .poll(async () => (await otorva<OtorvaTask[]>('GET', `/tasks?q=${encodeURIComponent(title)}`)).length)
    .toBe(1);
  const [created] = await otorva<OtorvaTask[]>('GET', `/tasks?q=${encodeURIComponent(title)}`);
  expect(created).toMatchObject({ assignee_id: people['margaret@demo.local'], sprint_ids: [sprints.current] });
  expect(created?.key).toMatch(/^DEMO-\d+$/);
  await expect(plannedCard(page, created?.key ?? '').first()).toBeVisible();
});

/** Контекстное меню карточки задачи в сайдбаре «Задачи». */
async function openCardMenu(page: Page, key: string): Promise<void> {
  await sidebarCard(page, key).first().click({ button: 'right' });
  await expect(page.getByText(ui.sprintPlanner.contextMenu.changeStatus)).toBeVisible();
}

async function otorvaTask(key: string): Promise<OtorvaTask> {
  const otorva = await standOtorvaApi();
  return otorva<OtorvaTask>('GET', `/tasks/by-key/${key}`);
}

test('TC-139: смена статуса из меню карточки уходит во встроенный трекер', async ({ page }) => {
  const key = seed().keys['DEMO-103'] ?? '';
  await openStandPlanner(page);
  // Workflow otorva по умолчанию линейный: из «беклог» — только в «готово к работе».
  const target = (await otorvaTask(key)).available_transitions?.find((s) => s.name === 'готово к работе');
  expect(target).toBeDefined();

  await openCardMenu(page, key);
  await page.getByText(ui.sprintPlanner.contextMenu.changeStatus).click();
  await page.getByRole('button', { name: 'готово к работе' }).click();

  await expect.poll(async () => (await otorvaTask(key)).status_id).toBe(target?.id);
  await expect(sidebarCard(page, key).first()).toContainText('готово к работе');
});

test('TC-140: перенос задачи в другой спринт меняет состав спринта во встроенном трекере', async ({ page }) => {
  const { keys, sprints } = seed();
  const key = keys['DEMO-109'] ?? '';
  await openStandPlanner(page);

  await openCardMenu(page, key);
  await page.getByText(ui.sprintPlanner.contextMenu.moveToSprint).click();
  // Спринты в подменю — номер и даты; номер спринта на доске стенда — его id в otorva.
  await page.getByRole('button', { name: new RegExp(`^${sprints.next} `) }).click();
  await page.getByText(ui.sprintPlanner.contextMenu.moveToSprintBacklog).click();

  await expect.poll(async () => (await otorvaTask(key)).sprint_ids).toEqual([sprints.next]);
  await expect(page.locator(`[data-task-id="${key}"]`)).toHaveCount(0);
});
