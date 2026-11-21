import { en, expect, openDemoPlanner, test } from '../fixtures';

const DAY_HEADING = /Fri|Thu|Wed|Tue|Mon|Sat|Sun/;

/** TC-100/101: вкладка «История» — кто что менял в спринте, с фильтрами по источнику и агенту. */
test('TC-100/101: история спринта показывает авторов и фильтруется', async ({ page }) => {
  await openDemoPlanner(page);
  await page.getByRole('button', { exact: true, name: en.sidebar.tabs.history }).click();

  const events = page.getByTestId('sprint-history-event');
  await expect(events.first()).toBeVisible();
  const total = await events.count();
  expect(total).toBeGreaterThan(5);

  // Новые сверху: первое событие — сдвиг срока агентом от имени Linus.
  const first = events.first();
  await expect(first).toContainText('Linus Torvalds');
  await expect(first).toContainText(en.sidebar.history.viaAgentBrand.replace('{brand}', 'Claude'));
  await expect(first).toContainText('Due date: 20.10 → 22.10');
  await expect(first).toContainText('DEMO-111 · Payouts report export');
  await expect(page.getByRole('heading', { name: DAY_HEADING }).first()).toBeVisible();
  await expect(events.filter({ hasText: en.sidebar.history.events.goal.done })).toHaveCount(1);
  await expect(events.filter({ hasText: en.sidebar.history.unknownActor })).toHaveCount(1);

  const filter = (name: string) => page.getByRole('tab', { exact: true, name });
  await filter(en.sidebar.history.filters.agent).click();
  await expect(events).toHaveCount(3);
  await filter(en.sidebar.history.filters.board).click();
  await expect(events.filter({ hasText: en.sidebar.history.events.issue.added })).toHaveCount(0);
  await expect(events.filter({ hasText: en.sidebar.history.events.note.create })).toHaveCount(1);
  await filter(en.sidebar.history.filters.tasks).click();
  await expect(events.filter({ hasText: en.sidebar.history.events.note.create })).toHaveCount(0);
  await filter(en.sidebar.history.filters.all).click();
  await expect(events).toHaveCount(total);
});
