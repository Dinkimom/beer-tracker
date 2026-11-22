import { en, expect, openDemoPlanner, test } from '../fixtures';
import { plannedCard } from '../swimlane';

const contextMenu = en.sprintPlanner.contextMenu;
const keyOnCard = '[data-swimlane] [data-task-card-field="key"]';

/**
 * TC-133: у встроенного трекера нет веб-интерфейса — ключ задачи остаётся текстом, а не ссылкой
 * «открыть в трекере», и в меню карточки нет «скопировать ссылку». У Яндекс Трекера ссылки на месте.
 */
test('TC-133: встроенный трекер — ключи задач текстом, без копирования ссылки', async ({ page }) => {
  await openDemoPlanner(page, { tracker: 'otorva' });
  await expect(page.locator(keyOnCard).first()).toBeVisible();
  await expect(page.locator(`${keyOnCard}`).first()).toHaveJSProperty('tagName', 'SPAN');
  await expect(page.locator('[data-swimlane] a[data-task-card-field="key"]')).toHaveCount(0);

  await plannedCard(page, 'DEMO-106').click({ button: 'right' });
  await expect(page.getByRole('button', { name: contextMenu.copyKey })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Copy task link/ })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // The same board with Yandex Tracker keeps links into the tracker.
  await openDemoPlanner(page);
  await expect(page.locator('[data-swimlane] a[data-task-card-field="key"]').first()).toBeVisible();
  await plannedCard(page, 'DEMO-106').click({ button: 'right' });
  await expect(page.getByRole('button', { name: /^Copy task link/ })).toBeVisible();
});
