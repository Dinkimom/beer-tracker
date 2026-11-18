import type { Page } from '@playwright/test';

import { DEMO_DEV_DISPLAY } from '@/lib/demo/demoFixtureSeedTasks';

import { en, expect, openDemoPlanner, test } from '../fixtures';

const controls = en.sprintPlanner.controls;

/** Триггер переключателя режима доски: в подписи — текущий режим. Пункты списка без aria-expanded. */
const modeTrigger = (page: Page, mode: string) =>
  page.getByRole('button', { exact: true, expanded: false, name: mode });

async function switchBoardMode(page: Page, from: string, to: string): Promise<void> {
  await modeTrigger(page, from).click();
  await page.getByRole('dialog').getByRole('button', { exact: true, name: to }).click();
  await expect(modeTrigger(page, to)).toBeVisible();
}

const undoButton = (page: Page) => page.getByRole('button', { name: new RegExp(`^${controls.undoPlanChange}`) });

test('TC-012: режимы доски — по исполнителям, по фичам, канбан', async ({ page }) => {
  await openDemoPlanner(page);

  await test.step('по исполнителям: строки людей, есть отмена плана', async () => {
    await expect(page.getByText(DEMO_DEV_DISPLAY.bob.name, { exact: true }).first()).toBeVisible();
    await expect(undoButton(page)).toBeVisible();
  });

  await test.step('канбан: колонки статусов, без отмены плана', async () => {
    await switchBoardMode(page, controls.viewByAssignees, controls.viewKanban);
    await expect(page.getByRole('heading', { exact: true, level: 3, name: 'In progress' })).toBeVisible();
    await expect(page.getByRole('heading', { exact: true, level: 3, name: 'Closed' })).toBeVisible();
    await expect(undoButton(page)).toHaveCount(0);
  });

  await test.step('по фичам: строки фич', async () => {
    await switchBoardMode(page, controls.viewKanban, controls.viewByFeatures);
    await expect(page.getByText('Checkout redesign', { exact: true }).first()).toBeVisible();
    await expect(undoButton(page)).toBeVisible();
    // Исполнитель в подвале карточки — «Имя Ф.» целиком: чип не должен резать имя при свободном месте.
    const assignee = page.locator('[data-swimlane] [data-task-id="DEMO-101"]').getByText('Linus T.', { exact: true });
    await expect(assignee).toBeVisible();
    expect(await assignee.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});
