import { openDemoPlanner, openSprintTab, SPRINT_TABS, test } from '../fixtures';

/** TC-010: каждая вкладка шапки открывает свой экран (доска — последней, чтобы проверить и возврат на неё). */
test('TC-010: вкладки шапки переключают экраны', async ({ page }) => {
  await openDemoPlanner(page);

  for (const tab of [...SPRINT_TABS.filter((key) => key !== 'board'), 'board' as const]) {
    await test.step(tab, () => openSprintTab(page, tab));
  }
});
