import { en, expect, openDemoPlanner, test } from '../fixtures';

const controls = en.sprintPlanner.controls;

/**
 * TC-013: у статуса «Need info» в демо нет колонки на доске. У него своя колонка, а не «No status»,
 * и в неё можно перенести задачу. DEMO-106 — в «Need info», DEMO-101 — в «In progress».
 */
test('TC-013: статус без колонки доски — своя колонка, в неё можно перенести задачу', async ({ page }) => {
  await openDemoPlanner(page);
  await page.getByRole('button', { exact: true, expanded: false, name: controls.viewByAssignees }).click();
  await page.getByRole('dialog').getByRole('button', { exact: true, name: controls.viewKanban }).click();

  // Шапки колонок отрисованы отдельно от тел; тело колонки статуса — по id `unmapped-status-<ключ>`.
  const needInfo = page.locator('[data-kanban-column="unmapped-status-needinfo"]');
  await expect(page.getByRole('heading', { exact: true, name: 'Need info' })).toBeVisible();
  await expect(page.getByRole('heading', { exact: true, name: en.sprintPlanner.kanban.unknownStatus })).toHaveCount(0);
  await expect(needInfo.locator('[data-task-id="DEMO-106"]')).toBeVisible();

  await test.step('перенос в колонку меняет статус', async () => {
    const card = await page.locator('[data-task-id="DEMO-101"]').first().boundingBox();
    const target = await needInfo.boundingBox();
    if (!card || !target) throw new Error('нет карточки DEMO-101 или колонки Need info');
    await page.mouse.move(card.x + 60, card.y + 40);
    await page.mouse.down();
    await page.mouse.move(card.x + 70, card.y + 45, { steps: 3 });
    await page.mouse.move(target.x + target.width / 2, target.y + target.height - 40, { steps: 20 });
    await page.mouse.up();
    await expect(needInfo.locator('[data-task-id="DEMO-101"]')).toBeVisible();
  });
});

/** TC-014: поиск, набранный на свимлейне, на канбане приглушает карточки, а не прячет их. */
test('TC-014: поиск по доске на канбане приглушает, а не прячет карточки', async ({ page }) => {
  await openDemoPlanner(page);
  await page.getByPlaceholder(controls.searchPlaceholder).fill('Payments webhook');
  await page.getByRole('button', { exact: true, expanded: false, name: controls.viewByAssignees }).click();
  await page.getByRole('dialog').getByRole('button', { exact: true, name: controls.viewKanban }).click();

  const card = (key: string) => page.locator(`[data-kanban-column] [data-task-id="${key}"]`).first();
  await expect(card('DEMO-109')).toBeVisible();
  await expect(card('DEMO-106')).toBeVisible();
  // Прозрачность поиска — инлайн на обёртке перетаскивания канбана (у самой карточки своя, у закрытых 0.8).
  const opacity = (key: string) =>
    card(key).evaluate((el) => {
      let node: HTMLElement | null = el as HTMLElement;
      while (node && !node.style.opacity) node = node.parentElement;
      return node?.style.opacity ?? '';
    });
  expect(await opacity('DEMO-109')).toBe('1');
  expect(await opacity('DEMO-106')).toBe('0.3');
});
