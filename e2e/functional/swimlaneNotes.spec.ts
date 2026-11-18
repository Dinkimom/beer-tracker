import { DEMO_DEV_ERIN } from '@/lib/demo/demoIds';

import { en, expect, openDemoPlanner, test } from '../fixtures';

/**
 * TC-029: пустой черновик заметки не пропадает сам. Черновик живёт только на клиенте, а фоновое
 * обновление задач раз в минуту заменяло список ответом сервера. Часы страницы перематываются за
 * интервал опроса (60 с). У Ken (erin) свободен четверг 15.10 — колонка дня 2.
 */
test('TC-029: пустой черновик заметки переживает фоновое обновление задач', async ({ page }) => {
  await page.clock.install();
  await page.clock.resume();
  await openDemoPlanner(page);
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: new RegExp(`^${en.sprintPlanner.swimlane.placementToolbar.comment}`) })
    .first()
    .click();

  const lane = await page.locator(`[data-swimlane="${DEMO_DEV_ERIN}"]`).boundingBox();
  const day = await page.locator('[data-onboarding-day="2"]').boundingBox();
  if (!lane || !day) throw new Error('нет строки Ken или колонки четверга');
  const draft = page.locator('[data-task-id^="local-task-"]').first();
  // Ячейка создаёт черновик по клику, когда наведение уже нарисовало превью места.
  await expect(async () => {
    await page.mouse.move(day.x + 20, lane.y + 30, { steps: 5 });
    await page.waitForTimeout(400);
    await page.mouse.down();
    await page.mouse.up();
    await expect(draft).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  await page.clock.fastForward(65_000);
  await page.waitForTimeout(1500);
  await expect(draft).toBeVisible();
});
