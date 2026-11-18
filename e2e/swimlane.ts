import type { Locator, Page } from '@playwright/test';

import { en } from './fixtures';

/**
 * Свимлейн «По исполнителям» в терминах плана: строка исполнителя, стартовая ячейка и длительность в ячейках
 * (день — 3 ячейки, `PARTS_PER_DAY`). Опоры в DOM — доменные id, не вёрстка:
 * строка — `[data-swimlane=<id исполнителя>]`, колонка дня — `[data-onboarding-day=<индекс>]`,
 * карточка — `[data-task-id=<ключ>]` с ролью button.
 */

const PARTS_PER_DAY = 3;

interface CardPlacement {
  /** id исполнителя строки (`DEMO_DEV_*`) или `__team__` для общей строки. */
  lane: string;
  /** Длительность в ячейках. */
  length: number;
  /** Индекс первой ячейки от начала спринта. */
  start: number;
}

/** Карточка задачи на свимлейне (не в сайдбаре). */
export function plannedCard(page: Page, key: string): Locator {
  return page.locator(`[data-swimlane] [data-task-id="${key}"][role="button"]`);
}

/** Карточка незапланированной задачи в сайдбаре «Задачи». */
export function sidebarCard(page: Page, key: string): Locator {
  return page.locator(`[data-task-id="${key}"][role="button"]:not([data-swimlane] *)`);
}

/** Вкладка сайдбара «Задачи»: в доступном имени — число незапланированных задач. */
export function sidebarTasksTab(page: Page): Locator {
  return page.getByRole('button', { name: new RegExp(`^${en.sidebar.tabs.tasks} \\d+$`) });
}

/** Ручка длительности карточки: правая меняет длительность, левая — начало и длительность. */
function resizeHandle(page: Page, key: string, side: 'left' | 'right'): Locator {
  const name = side === 'right' ? en.task.taskBar.resizeRightTitle : en.task.taskBar.resizeLeftTitle;
  return page.locator(`[data-swimlane] [data-task-id="${key}"]`).first().getByRole('separator', { name });
}

async function partWidth(page: Page): Promise<number> {
  const day = await page.locator('[data-onboarding-day="0"]').boundingBox();
  if (!day) throw new Error('нет колонки первого дня — открыт не свимлейн?');
  return day.width / PARTS_PER_DAY;
}

/** Число ячеек в спринте — по колонкам дней в шапке. */
export async function sprintPartCount(page: Page): Promise<number> {
  return (await page.locator('[data-onboarding-day]').count()) * PARTS_PER_DAY;
}

/** Где стоит карточка; null — карточки на свимлейне нет. Для `expect.poll`. */
export async function cardPlacement(page: Page, key: string): Promise<CardPlacement | null> {
  const card = plannedCard(page, key);
  if ((await card.count()) === 0) return null;
  const part = await partWidth(page);
  const laneId = await card.evaluate((el) => el.closest<HTMLElement>('[data-swimlane]')?.dataset.swimlane ?? '');
  const laneBox = await page.locator(`[data-swimlane="${laneId}"]`).boundingBox();
  const cardBox = await card.boundingBox();
  if (!laneBox || !cardBox) return null;
  // Карточка отстоит от начала ячейки на поле (~12 px из ~91): округление до ближайшей ячейки его съедает.
  return {
    lane: laneId,
    length: Math.round(cardBox.width / part),
    start: Math.floor((cardBox.x - laneBox.x) / part),
  };
}

/** Жест мыши, который распознаёт dnd-kit: нажать, сдвинуться за порог активации, плавно довести, отпустить. */
async function dragMouse(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 4, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
}

const GRAB_OFFSET = 30;

/**
 * Перетаскивает карточку (со свимлейна или из сайдбара) так, чтобы её левый верхний угол лёг в ячейку
 * `start` строки `lane`. Берём за точку у левого края, а не за центр: карточка встаёт туда, куда
 * пришёл этот угол.
 */
export async function dragCardToCell(page: Page, card: Locator, lane: string, start: number): Promise<void> {
  const cardBox = await card.boundingBox();
  const laneBox = await page.locator(`[data-swimlane="${lane}"]`).boundingBox();
  if (!cardBox || !laneBox) throw new Error(`нет карточки или строки ${lane}`);
  const part = await partWidth(page);
  await dragMouse(
    page,
    { x: cardBox.x + GRAB_OFFSET, y: cardBox.y + GRAB_OFFSET },
    { x: laneBox.x + start * part + 12 + GRAB_OFFSET, y: laneBox.y + 12 + GRAB_OFFSET }
  );
}

/** Перетаскивает карточку со свимлейна на точку `target` (например, в сайдбар). */
export async function dragCardTo(page: Page, card: Locator, target: Locator): Promise<void> {
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox) throw new Error('нет карточки или цели переноса');
  await dragMouse(
    page,
    { x: cardBox.x + GRAB_OFFSET, y: cardBox.y + GRAB_OFFSET },
    { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 }
  );
}

/** Тянет ручку длительности на `parts` ячеек (минус — влево). Ручка видна по наведению на карточку. */
export async function resizeCard(page: Page, key: string, side: 'left' | 'right', parts: number): Promise<void> {
  await plannedCard(page, key).hover();
  const handle = resizeHandle(page, key, side);
  const box = await handle.boundingBox();
  if (!box) throw new Error(`нет ручки ${side} у ${key}`);
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await dragMouse(page, from, { x: from.x + parts * (await partWidth(page)), y: from.y });
}
