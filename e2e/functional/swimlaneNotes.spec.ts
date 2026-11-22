import type { Locator, Page } from '@playwright/test';

import { DEMO_DEV_ERIN } from '@/lib/demo/demoIds';

import { en, expect, openDemoPlanner, test } from '../fixtures';

/**
 * TC-029: пустой черновик заметки не пропадает сам. Черновик живёт только на клиенте, а фоновое
 * обновление задач раз в минуту заменяло список ответом сервера. Часы страницы перематываются за
 * интервал опроса (60 с). У Ken (erin) свободен четверг 15.10 — колонка дня 2.
 */
/** Инструмент «Заметка» и клик по свободной ячейке Ken (erin) в четверг 15.10 — колонка дня 2. */
async function createNoteDraftInFreeCell(page: Page): Promise<Locator> {
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: new RegExp(`^${en.sprintPlanner.swimlane.placementToolbar.comment}`) })
    .first()
    .click();

  const draft = page.locator('[data-task-id^="local-task-"]').first();
  // Ячейка создаёт черновик по клику, когда наведение уже нарисовало превью места.
  // Координаты — на каждой попытке: под нагрузкой строки ещё сдвигаются после первой отрисовки.
  await expect(async () => {
    const lane = await page.locator(`[data-swimlane="${DEMO_DEV_ERIN}"]`).boundingBox();
    const day = await page.locator('[data-onboarding-day="2"]').boundingBox();
    if (!lane || !day) throw new Error('нет строки Ken или колонки четверга');
    await page.mouse.move(day.x + 20, lane.y + 30, { steps: 5 });
    await page.waitForTimeout(400);
    await page.mouse.down();
    await page.mouse.up();
    await expect(draft).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  return draft;
}

test('TC-029: пустой черновик заметки переживает фоновое обновление задач', async ({ page }) => {
  await page.clock.install();
  await page.clock.resume();
  await openDemoPlanner(page);
  const draft = await createNoteDraftInFreeCell(page);

  await page.clock.fastForward(65_000);
  await page.waitForTimeout(1500);
  await expect(draft).toBeVisible();
});

/**
 * TC-104: заметка из быстрого добавления сохраняется с текстом. Проходит всю цепочку быстрого
 * добавления (`QuickAddController`): ввод текста черновика и сохранение доходят от доски до карточки.
 */
test('TC-104: заметка из быстрого добавления сохраняется с введённым текстом', async ({ page }) => {
  await openDemoPlanner(page);
  const draft = await createNoteDraftInFreeCell(page);
  const text = 'Проверить цепочку быстрого добавления';

  await draft.locator('[contenteditable="true"], textarea').first().click();
  await page.keyboard.type(text);
  await page
    .locator('[data-swimlane-draft-save]')
    .getByRole('button', { name: en.common.confirm })
    .click();

  await expect(page.locator('[id^="task-comment:"]').filter({ hasText: text })).toBeVisible();
  await expect(page.locator('[data-task-id^="local-task-"]')).toHaveCount(0);
});

/**
 * TC-131: @-упоминание в заметке. Escape сначала закрывает список, черновик с текстом остаётся. В режиме
 * фокуса список один: лист на доске под оверлеем получает тот же текст, но свой список не открывает.
 * Клик по упоминанию на доске не глотает дальнейший набор.
 */
test('TC-131: список упоминаний — Escape закрывает его, не черновик; в режиме фокуса список один', async ({ page }) => {
  await openDemoPlanner(page);
  const draft = await createNoteDraftInFreeCell(page);
  const editor = draft.locator('[contenteditable="true"]').first();
  const toolbar = en.sprintPlanner.swimlane.placementToolbar;
  await editor.click();
  await page.keyboard.type('Ask @');
  await expect(page.getByRole('listbox')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(editor).toHaveText('Ask @');
  await expect(page.locator('[data-task-id^="local-task-"]')).not.toHaveCount(0);

  await page.keyboard.press('Backspace');
  await page.getByRole('button', { name: toolbar.noteExpand }).click();
  await page.keyboard.type(' @');
  await expect(page.getByRole('listbox')).toHaveCount(1);
  await page.getByRole('listbox').getByRole('button', { name: 'Ken Thompson' }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.locator('[contenteditable="true"]').last()).toContainText('@Ken Thompson');

  // Упоминание не редактируется: клик по нему ставит каретку после, набор не теряется.
  await page.getByRole('button', { name: toolbar.noteCollapse }).click();
  await editor.locator('[data-note-mention]').click();
  await page.keyboard.type('Z');
  await expect(editor).toContainText('@Ken ThompsonZ');
});

