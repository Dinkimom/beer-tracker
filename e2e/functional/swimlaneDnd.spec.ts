import { DEMO_DEV_ALICE, DEMO_DEV_BOB, DEMO_DEV_DANA, DEMO_DEV_ERIN } from '@/lib/demo/demoIds';

import { en, expect, openDemoPlanner, test } from '../fixtures';
import {
  cardPlacement,
  dragCardTo,
  dragCardToCell,
  plannedCard,
  resizeCard,
  sidebarCard,
  sidebarTasksTab,
  sprintPartCount,
} from '../swimlane';

/**
 * Планирование на свимлейне «По исполнителям» (TC-021…025). Раскладка фикстуры на старте:
 * DEMO-104 — Guido (bob), ячейки 0–2; DEMO-106 — Linus (alice), 9–11; DEMO-109 — Ken (erin), 0–5;
 * DEMO-112 — Ken, 24–26 (последние ячейки спринта); DEMO-111 — в сайдбаре; у Ken свободны ячейки 6–8.
 * Ячейка = треть дня, день 2 (четверг 15.10) — ячейки 6–8.
 */

const tasksTab = (count: number) => `${en.sidebar.tabs.tasks} ${count}`;

test.beforeEach(async ({ page }) => {
  await openDemoPlanner(page);
  await expect(sidebarTasksTab(page)).toHaveAccessibleName(tasksTab(11));
});

test('TC-021: задача из сайдбара перетаскивается в ячейку исполнителя', async ({ page }) => {
  await dragCardToCell(page, sidebarCard(page, 'DEMO-111'), DEMO_DEV_ERIN, 6);

  await expect.poll(() => cardPlacement(page, 'DEMO-111')).toEqual({ lane: DEMO_DEV_ERIN, length: 3, start: 6 });
  await expect(sidebarCard(page, 'DEMO-111')).toHaveCount(0);
  await expect(sidebarTasksTab(page)).toHaveAccessibleName(tasksTab(10));
});

test('TC-022: карточка переносится к другому исполнителю и на другой день', async ({ page }) => {
  await test.step('к другому исполнителю', async () => {
    await dragCardToCell(page, plannedCard(page, 'DEMO-104'), DEMO_DEV_DANA, 6);
    await expect.poll(() => cardPlacement(page, 'DEMO-104')).toEqual({ lane: DEMO_DEV_DANA, length: 3, start: 6 });
  });

  await test.step('на другой день в той же строке', async () => {
    await dragCardToCell(page, plannedCard(page, 'DEMO-104'), DEMO_DEV_DANA, 3);
    await expect.poll(() => cardPlacement(page, 'DEMO-104')).toEqual({ lane: DEMO_DEV_DANA, length: 3, start: 3 });
  });

  await expect(sidebarTasksTab(page)).toHaveAccessibleName(tasksTab(11));
});

test('TC-023: длительность меняется за край и не выходит за спринт', async ({ page }) => {
  await test.step('правый край — длительность', async () => {
    await resizeCard(page, 'DEMO-104', 'right', 2);
    await expect.poll(() => cardPlacement(page, 'DEMO-104')).toEqual({ lane: DEMO_DEV_BOB, length: 5, start: 0 });
  });

  await test.step('левый край — начало и длительность', async () => {
    await resizeCard(page, 'DEMO-104', 'left', 1);
    await expect.poll(() => cardPlacement(page, 'DEMO-104')).toEqual({ lane: DEMO_DEV_BOB, length: 4, start: 1 });
  });

  await test.step('за конец спринта не тянется', async () => {
    const lastPart = await sprintPartCount(page);
    await plannedCard(page, 'DEMO-112').scrollIntoViewIfNeeded();
    await expect.poll(() => cardPlacement(page, 'DEMO-112')).toEqual({
      lane: DEMO_DEV_ERIN,
      length: 3,
      start: lastPart - 3,
    });
    await resizeCard(page, 'DEMO-112', 'right', 3);
    await expect.poll(() => cardPlacement(page, 'DEMO-112')).toEqual({
      lane: DEMO_DEV_ERIN,
      length: 3,
      start: lastPart - 3,
    });
  });
});

test('TC-024: карточка возвращается в сайдбар — меню и перетаскиванием', async ({ page }) => {
  await test.step('«Удалить из плана» в контекстном меню', async () => {
    await expect.poll(() => cardPlacement(page, 'DEMO-106')).toEqual({ lane: DEMO_DEV_ALICE, length: 3, start: 9 });
    await plannedCard(page, 'DEMO-106').click({ button: 'right' });
    await page.getByRole('button', { name: en.sprintPlanner.contextMenu.removeFromPlan }).click();
    await expect(plannedCard(page, 'DEMO-106')).toHaveCount(0);
    await expect(sidebarCard(page, 'DEMO-106')).toHaveCount(1);
    await expect(sidebarTasksTab(page)).toHaveAccessibleName(tasksTab(12));
  });

  await test.step('перетаскиванием на сайдбар', async () => {
    // Цель — верх списка сайдбара: нижние карточки на другом шрифте уходят за край окна.
    // После «Удалить из плана» доска прокручена вбок (CLEANUP_BACKLOG) — захват ищет видимую часть карточки.
    await dragCardTo(page, plannedCard(page, 'DEMO-109'), sidebarCard(page, 'DEMO-111'));
    await expect(plannedCard(page, 'DEMO-109')).toHaveCount(0);
    await expect(sidebarCard(page, 'DEMO-109')).toHaveCount(1);
    await expect(sidebarTasksTab(page)).toHaveAccessibleName(tasksTab(13));
  });
});

test('TC-025: перенос карточки отменяется и повторяется', async ({ page }) => {
  const controls = en.sprintPlanner.controls;
  const undo = page.getByRole('button', { name: new RegExp(`^${controls.undoPlanChange}`) });
  const redo = page.getByRole('button', { name: new RegExp(`^${controls.redoPlanChange}`) });
  await expect(undo).toBeDisabled();

  await dragCardToCell(page, plannedCard(page, 'DEMO-104'), DEMO_DEV_DANA, 6);
  await expect.poll(() => cardPlacement(page, 'DEMO-104')).toEqual({ lane: DEMO_DEV_DANA, length: 3, start: 6 });

  await test.step('отменить', async () => {
    await undo.click();
    await expect.poll(() => cardPlacement(page, 'DEMO-104')).toEqual({ lane: DEMO_DEV_BOB, length: 3, start: 0 });
    await expect(redo).toBeEnabled();
  });

  await test.step('повторить', async () => {
    await redo.click();
    await expect.poll(() => cardPlacement(page, 'DEMO-104')).toEqual({ lane: DEMO_DEV_DANA, length: 3, start: 6 });
  });
});
