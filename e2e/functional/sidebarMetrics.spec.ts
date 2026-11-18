import { en, expect, openDemoPlanner, test } from '../fixtures';

/** TC-090: блок «По статусам» во вкладке сайдбара «Метрики» подписан названиями статусов, не ключами трекера. */
test('TC-090: объём по статусам подписан названиями статусов', async ({ page }) => {
  await openDemoPlanner(page);
  // «Metrics» есть и в шапке (вкладка экрана) — берём кнопку сайдбара вне навигации шапки.
  await page
    .getByRole('button', { exact: true, name: en.sidebar.tabs.metrics })
    .and(page.locator(':not(nav *)'))
    .click();

  const byStatus = page
    .getByRole('heading', { name: en.sidebar.metrics.byStatus })
    .locator('xpath=following-sibling::div[1]');
  await expect(byStatus).toContainText('In progress');
  await expect(byStatus).toContainText('Need info');
  await expect(byStatus).not.toContainText('inProgress');
  await expect(byStatus).not.toContainText('needInfo');
});
