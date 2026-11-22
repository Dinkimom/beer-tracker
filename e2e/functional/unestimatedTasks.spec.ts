import { en, expect, openDemoPlanner, openSprintTab, test } from '../fixtures';

test.use({ demoFixture: 'stress' });

const controls = en.sprintPlanner.controls;

/**
 * TC-141: задачи без оценки не прячутся. В стресс-данных у части задач нет SP: у человека, все задачи которого
 * без оценки, в шапке строки — «Unestimated: N», а не «?sp»; итоги спринта (скор, диаграмма сгорания, колонки
 * канбана) говорят, сколько задач не оценено.
 */
test('TC-141: задачи без оценки видны в шапке строки, скоре, диаграмме сгорания и канбане', async ({ page }) => {
  await openDemoPlanner(page);
  const unestimated = page.locator('[data-unestimated-count]');

  // Шапка строки: у человека, все задачи которого без оценки, вместо «?sp» — счётчик.
  await expect(unestimated.filter({ hasText: /^Unestimated: 1$/ }).first()).toBeVisible();

  // «Metrics» есть и в шапке (вкладка экрана) — кнопка сайдбара вне навигации шапки.
  await page.getByRole('button', { exact: true, name: en.sidebar.tabs.metrics }).and(page.locator(':not(nav *)')).click();
  await expect(page.locator('[data-unestimated-count]').filter({ hasText: /Unestimated: \d+/ }).first()).toBeVisible();

  await page.getByRole('button', { exact: true, expanded: false, name: controls.viewByAssignees }).click();
  await page.getByRole('dialog').getByRole('option', { exact: true, name: controls.viewKanban }).click();
  await expect(page.locator('[data-kanban-header] [data-unestimated-count]').first()).toBeVisible();

  await openSprintTab(page, 'burndown');
  await expect(page.locator('[data-unestimated-count]').first()).toBeVisible();
});
