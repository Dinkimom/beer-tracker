import { en, expect, openDemoPlanner, test } from '../fixtures';

/** TC-110: в настройках — только те вкладки сайдбара, что реально есть в планере. */
test('TC-110: список вкладок сайдбара в настройках', async ({ page }) => {
  await openDemoPlanner(page);
  await page.getByRole('button', { name: en.header.actions.settings }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { exact: true, name: en.settings.tabs.general }).click();

  const section = dialog.locator('section', {
    has: page.getByRole('heading', { name: en.settings.generalTab.sections.sidebarTabs }),
  });
  for (const label of [en.sidebar.tabs.tasks, en.sidebar.tabs.goals, en.sidebar.tabs.metrics, en.sidebar.tabs.history]) {
    await expect(section.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(section.getByText('Backlog', { exact: true })).toHaveCount(0);
});
