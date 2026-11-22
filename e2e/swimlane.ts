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

/** Вкладка сайдбара «Задачи»: в доступном имени — число незапланированных задач. Подпись — на языке страницы. */
export function sidebarTasksTab(page: Page, label: string = en.sidebar.tabs.tasks): Locator {
  return page.getByRole('button', { name: new RegExp(`^${label} \\d+$`) });
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

/**
 * Отступ от левого верхнего угла карточки, за который её можно взять: первая точка, где ближайший
 * интерактивный элемент под курсором — сама карточка. Иначе жест возьмёт не то: край карточки может уйти
 * под липкую колонку участников (там ручка её ширины), а за ссылку на задачу браузер тянет саму ссылку.
 */
async function grabOffset(card: Locator): Promise<{ x: number; y: number }> {
  const offset = await card.evaluate((el) => {
    const box = el.getBoundingClientRect();
    for (const y of [12, box.height - 12, box.height / 2]) {
      for (let x = 30; x < box.width - 10; x += 20) {
        const hit = document.elementFromPoint(box.left + x, box.top + y);
        if (hit?.closest('a, button, [role=button], [role=separator]') === el) return { x, y };
      }
    }
    return null;
  });
  if (offset === null) throw new Error('карточку не за что взять: её закрывают другие элементы');
  return offset;
}

/**
 * Перетаскивает карточку (со свимлейна или из сайдбара) так, чтобы её левый верхний угол лёг в ячейку
 * `start` строки `lane`: точку захвата ведём в ту же точку относительно ячейки, где она была относительно карточки.
 */
export async function dragCardToCell(page: Page, card: Locator, lane: string, start: number): Promise<void> {
  const cardBox = await card.boundingBox();
  const laneBox = await page.locator(`[data-swimlane="${lane}"]`).boundingBox();
  if (!cardBox || !laneBox) throw new Error(`нет карточки или строки ${lane}`);
  const part = await partWidth(page);
  const grab = await grabOffset(card);
  await dragMouse(
    page,
    { x: cardBox.x + grab.x, y: cardBox.y + grab.y },
    { x: laneBox.x + start * part + 12 + grab.x, y: laneBox.y + 12 + grab.y }
  );
}

/** Перетаскивает карточку со свимлейна на точку `target` (например, в сайдбар). */
export async function dragCardTo(page: Page, card: Locator, target: Locator): Promise<void> {
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox) throw new Error('нет карточки или цели переноса');
  const grab = await grabOffset(card);
  await dragMouse(
    page,
    { x: cardBox.x + grab.x, y: cardBox.y + grab.y },
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
