import { en, expect, openDemoPlanner, test } from '../fixtures';

const goalsTab = en.sidebar.goalsTab;

/**
 * TC-040, TC-041. Добавление, правка и удаление целей (TC-042…044) в демо недоступны:
 * редактирует только админ организации, а демо-пользователь не админ.
 */
test('TC-040/041: цели спринта видны и отмечаются', async ({ page }) => {
  await openDemoPlanner(page);
  // Подпись вкладки сайдбара включает бейдж прогресса: «Sprint 1/4».
  const tab = page.getByRole('button', { name: new RegExp(`^${en.sidebar.tabs.goals} \\d+/\\d+$`) });
  await expect(tab).toHaveAccessibleName(`${en.sidebar.tabs.goals} 1/4`);
  await tab.click();

  await expect(page.getByRole('heading', { name: goalsTab.deliveryGoalsHeading })).toBeVisible();
  await expect(page.getByRole('heading', { name: goalsTab.discoveryGoalsHeading })).toBeVisible();

  const goal = page.getByRole('checkbox', { name: 'Checkout MVP behind flag' });
  await expect(goal).not.toBeChecked();
  await goal.check();
  await expect(goal).toBeChecked();
  await expect(tab).toHaveAccessibleName(`${en.sidebar.tabs.goals} 2/4`);
});
