import type { Page } from '@playwright/test';

import { DEMO_DEV_ERIN } from '@/lib/demo/demoIds';

import { en, expect, openDemoPlanner, test } from '../fixtures';

const quickAdd = en.sprintPlanner.swimlane.quickAddMenu;

/** Инструмент «Задача» и клик по свободной ячейке Ken (erin) в четверг 15.10 — колонка дня 2. */
async function openQuickAddInFreeCell(page: Page) {
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: new RegExp(`^${en.sprintPlanner.swimlane.placementToolbar.task}`) })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  // Координаты — на каждой попытке: под нагрузкой строки ещё сдвигаются после первой отрисовки.
  await expect(async () => {
    const lane = await page.locator(`[data-swimlane="${DEMO_DEV_ERIN}"]`).boundingBox();
    const day = await page.locator('[data-onboarding-day="2"]').boundingBox();
    if (!lane || !day) throw new Error('нет строки Ken или колонки четверга');
    await page.mouse.move(day.x + 20, lane.y + 30, { steps: 5 });
    await page.waitForTimeout(400);
    await page.mouse.down();
    await page.mouse.up();
    await expect(dialog.getByRole('menu', { name: quickAdd.modeTablist })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  return dialog;
}

/**
 * TC-132: меню быстрого добавления. Черновик, варианты и действия меню собирает сегмент карточки
 * (`buildTaskLayerPlanSegmentQuickAddMenu`) — ввод в форме должен дойти до карточки-черновика на доске,
 * а закрытие — убрать черновик. Создание задачи в трекере на демо не проверяется: трекера там нет.
 */
test('TC-132: меню быстрого добавления — новая задача, задача из трекера, закрытие', async ({ page }) => {
  await openDemoPlanner(page);
  const dialog = await openQuickAddInFreeCell(page);
  const draft = page.locator('[data-task-id^="local-task-"]');
  const title = 'Проверить меню быстрого добавления';

  await dialog.getByRole('menuitem', { name: quickAdd.modeNew }).click();
  await expect(dialog.getByRole('heading', { name: quickAdd.modeNew })).toBeVisible();
  await expect(dialog.getByRole('button', { name: quickAdd.create })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: /^DEMO/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: quickAdd.parentNone })).toBeVisible();

  await dialog.getByRole('textbox', { name: quickAdd.titlePlaceholder }).fill(title);
  await expect(dialog.getByRole('button', { name: quickAdd.create })).toBeEnabled();
  await expect(draft.filter({ hasText: title }).first()).toBeVisible();

  await dialog.getByRole('button', { name: quickAdd.backToKindPicker }).click();
  await expect(dialog.getByRole('menu', { name: quickAdd.modeTablist })).toBeVisible();
  await expect(draft.filter({ hasText: title })).toHaveCount(0);

  await dialog.getByRole('menuitem', { name: /^From / }).click();
  const search = dialog.getByRole('combobox', { name: quickAdd.searchPlaceholder });
  await expect(search).toBeFocused();
  await page.keyboard.type('DEMO');
  await expect(search).toHaveValue('DEMO');

  await dialog.getByRole('button', { name: quickAdd.close }).click();
  await expect(dialog).toHaveCount(0);
  await expect(draft).toHaveCount(0);
});
