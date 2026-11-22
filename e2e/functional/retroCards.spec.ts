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

/** TC-085: реакция на карточку ретро. В демо нет сессии трекера — раньше реакция молча не ставилась. */
test('TC-085: реакция на карточку ретро ставится и снимается', async ({ page }) => {
  await openDemoPlanner(page);
  await openSprintTab(page, 'retro');

  const column = page.getByRole('region', { name: en.retro.presets.glad });
  await column.getByRole('button', { name: en.retro.addCard }).click();
  const input = column.getByRole('textbox', { name: en.retro.addCard });
  await input.fill('E2E: reactions');
  await input.press('Enter');
  const card = column.getByRole('article').filter({ hasText: 'E2E: reactions' });
  await expect(card).toBeVisible();

  await card.hover();
  await card.getByRole('button', { name: en.comments.addReactionAria }).click();
  // Тулбар реакций — в поповере у карточки (портал), а не чипы соседних карточек.
  await page.locator('[data-radix-popper-content-wrapper]').getByRole('button', { name: /^React with / }).first().click();
  const mine = card.locator('[aria-pressed="true"]');
  await expect(mine).toHaveCount(1);

  await mine.click();
  await expect(card.locator('[aria-pressed="true"]')).toHaveCount(0);
});
