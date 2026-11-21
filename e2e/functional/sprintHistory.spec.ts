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
  await expect(events.filter({ hasText: en.sidebar.history.unknownActor }).getByText('?', { exact: true })).toBeVisible();
  // Снятая со спринта задача — с названием из снимка; стрелка — с концами.
  await expect(events.filter({ hasText: 'DEMO-204' })).toContainText('DEMO-204 · Mobile: biometric confirm');
  await expect(events.filter({ hasText: en.sidebar.history.events.link.create })).toContainText('→ DEMO-104');

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

/** TC-102: клик по событию показывает карточку на доске или вкладку целей. */
test('TC-102: событие истории ведёт к карточке на доске', async ({ page }) => {
  await openDemoPlanner(page);
  await page.getByRole('button', { exact: true, name: en.sidebar.tabs.history }).click();
  const events = page.getByTestId('sprint-history-event');

  // Задача на доске — прокрутка и подсветка карточки.
  await events.filter({ hasText: 'DEMO-109' }).getByRole('button').click();
  await expect(page.locator('[id="task-DEMO-109"] .ring-amber-500, [id="task-DEMO-109"].ring-amber-500')).toHaveCount(1);

  // Задача спринта не разложена на доске — открывается панель задачи.
  await events.filter({ hasText: 'DEMO-111' }).getByRole('button').click();
  await expect(page.getByText('Payouts report export', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { exact: true, name: en.sprintPlanner.taskInfo.close }).click();

  // Заметка — подсвечивается её карточка на доске.
  await events.filter({ hasText: en.sidebar.history.events.note.create }).getByRole('button').click();
  await expect(page.locator('[id$="demo-note-1"].ring-amber-500, [id$="demo-note-1"] .ring-amber-500')).toHaveCount(1);

  // Снятая со спринта задача на доске не лежит — строка не кнопка.
  await expect(events.filter({ hasText: 'DEMO-204' }).getByRole('button')).toHaveCount(0);

  await events.filter({ hasText: en.sidebar.history.events.goal.done }).getByRole('button').click();
  await expect(page.getByRole('heading', { name: en.sidebar.goalsTab.deliveryGoalsHeading })).toBeVisible();
});

/** TC-103: наведение на ключ задачи показывает её паспорт, в том числе для задачи вне спринта. */
test('TC-103: паспорт задачи при наведении на ключ в истории', async ({ page }) => {
  await openDemoPlanner(page);
  await page.getByRole('button', { exact: true, name: en.sidebar.tabs.history }).click();
  const events = page.getByTestId('sprint-history-event');
  // Radix кладёт копию содержимого в скрытый узел для скринридеров — берём видимую.
  const passport = page.getByTestId('task-passport').first();

  await events.filter({ hasText: 'DEMO-109' }).getByTestId('sprint-history-issue').hover();
  await expect(passport).toContainText('Payments webhook: signature check');
  await expect(passport).toContainText(en.taskPassport.assignee);
  await expect(passport).toContainText(en.taskPassport.estimate);

  await page.mouse.move(0, 0);
  await expect(passport).toBeHidden();

  // Снята со спринта: в задачах спринта её нет, паспорт приходит запросом по ключу.
  await events.filter({ hasText: 'DEMO-204' }).getByTestId('sprint-history-issue').hover();
  await expect(passport).toContainText('DEMO-204');
});

