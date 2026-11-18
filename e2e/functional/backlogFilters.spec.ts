import { DEMO_DEV_DISPLAY } from '@/lib/demo/demoFixtureSeedTasks';

import { en, expect, openDemoPlanner, openSprintTab, test } from '../fixtures';

const visibleCount = (visible: number, total: number) =>
  en.backlog.section.visibleCount.replace('{visible}', String(visible)).replace('{total}', String(total));

/** TC-034: кнопка фильтра по исполнителю названа именем человека, нажатие оставляет его задачи. */
test('TC-034: фильтр бэклога по исполнителю выбирает человека по имени', async ({ page }) => {
  await openDemoPlanner(page);
  await openSprintTab(page, 'backlog');

  const filter = page.getByRole('group', { name: en.backlog.filters.assigneeAria });
  const ken = filter.getByRole('button', { exact: true, name: DEMO_DEV_DISPLAY.erin.name });
  await expect(page.getByText(visibleCount(5, 12))).toBeVisible();
  await expect(ken).toHaveAttribute('aria-pressed', 'false');

  await ken.click();
  await expect(ken).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(visibleCount(4, 12))).toBeVisible();
});
