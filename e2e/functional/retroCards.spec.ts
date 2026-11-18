import { en, expect, openDemoPlanner, openSprintTab, test } from '../fixtures';

/** TC-080, TC-081: доска ретро, карточка добавляется в колонку и удаляется. */
test('TC-080/081: карточка ретро добавляется и удаляется', async ({ page }) => {
  await openDemoPlanner(page);
  await openSprintTab(page, 'retro');

  const column = page.getByRole('region', { name: en.retro.presets.glad });
  const card = column.getByRole('article').filter({ hasText: 'E2E: pairing on reviews' });

  await test.step('добавить', async () => {
    await column.getByRole('button', { name: en.retro.addCard }).click();
    const input = column.getByRole('textbox', { name: en.retro.addCard });
    await expect(column.getByRole('button', { name: en.retro.addCardSubmit })).toBeDisabled();
    await input.fill('E2E: pairing on reviews');
    await input.press('Enter');
    await expect(card).toBeVisible();
  });

  await test.step('удалить', async () => {
    await card.getByRole('button', { name: en.retro.deleteCard }).click();
    await expect(card).toHaveCount(0);
  });
});
