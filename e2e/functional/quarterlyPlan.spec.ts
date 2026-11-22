import type { Locator, Page } from '@playwright/test';

import { en, expect, openDemoPlanner, openSprintTab, test } from '../fixtures';

const q = en.quarterlyPlan;

// «Текущий квартал» считается от `Date.now()` браузера: без заморозки тест сломается с наступлением 2027 года.
test.use({ frozenClock: true });

async function openRoadmap(page: Page): Promise<Locator> {
  await openDemoPlanner(page);
  await openSprintTab(page, 'quarter');
  return page.getByRole('region', { name: 'Demo Team' });
}

/** Шапка строки плана (направление или эпик): ближайший блок с названием и кнопкой «Actions». */
function rowHeader(scope: Locator, title: string): Locator {
  return scope
    .locator('div')
    .filter({ has: scope.page().getByText(title, { exact: true }) })
    .filter({ has: scope.page().getByRole('button', { exact: true, name: q.rowActions }) })
    .last();
}

async function addDirection(team: Locator, title: string): Promise<void> {
  await team.getByRole('button', { exact: true, name: q.addDirection }).first().click();
  await team.page().getByRole('textbox', { name: q.addDirectionPlaceholder }).fill(title);
  await team.page().keyboard.press('Enter');
  await expect(team.getByRole('button', { exact: true, name: title })).toBeVisible();
}

const assignCell = (scope: Locator, title: string, week: string) =>
  scope.getByRole('button', { exact: true, name: `${q.assignWeek.replace('{title}', title)} ${week}` });

test('TC-120: квартал листается вперёд и возвращается к текущему', async ({ page }) => {
  const team = await openRoadmap(page);
  await expect(team.getByRole('button', { exact: true, name: 'Checkout redesign' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Platform Team' })).toBeVisible();

  await page.getByRole('button', { name: q.nextQuarter }).click();
  await expect(page.getByText('Q1 2027', { exact: true }).first()).toBeVisible();
  await expect(team.getByRole('button', { exact: true, name: 'Checkout redesign' })).toHaveCount(0);

  await page.getByRole('button', { exact: true, name: q.today }).click();
  await expect(page.getByText('Q4 2026', { exact: true }).first()).toBeVisible();
  await expect(team.getByRole('button', { exact: true, name: 'Checkout redesign' })).toBeVisible();
});

test('TC-121: новое направление и эпик в нём', async ({ page }) => {
  const team = await openRoadmap(page);
  await addDirection(team, 'Onboarding');

  await rowHeader(team, 'Onboarding').getByRole('button', { exact: true, name: q.addEpic }).click();
  await page.getByRole('dialog').getByRole('button', { name: q.menuNewEpic }).click();
  await page.getByRole('textbox', { name: q.addEpicPlaceholder }).fill('Welcome email');
  await page.keyboard.press('Enter');

  const epic = rowHeader(team, 'Welcome email');
  await expect(epic).toBeVisible();
  await expect(epic.getByTitle(q.unplannedHint)).toHaveText(q.unplanned);
});

test('TC-122: человек назначается на неделю эпика', async ({ page }) => {
  const team = await openRoadmap(page);
  const direction = rowHeader(team, 'Receipts & invoices');
  await expect(direction.getByText(q.unplannedCount.replace('{count}', '2'))).toBeVisible();

  await assignCell(team, 'Invoice email templates', '09–13.11').click();
  const picker = page.getByRole('dialog');
  await expect(picker.getByText(`${q.menuAssign} · 09.11–13.11`)).toBeVisible();
  await picker.getByRole('button', { exact: true, name: 'Linus Torvalds' }).click();

  await expect(team.getByRole('button', { name: 'Linus Torvalds, Delivery, 09.11–13.11' })).toBeVisible();
  await expect(rowHeader(team, 'Invoice email templates').getByTitle(q.unplannedHint)).toHaveCount(0);
  await expect(direction.getByText(q.unplannedCount.replace('{count}', '1'))).toBeVisible();
});

test('TC-123: эпик убирается из плана после подтверждения', async ({ page }) => {
  const team = await openRoadmap(page);
  await rowHeader(team, 'Fiscal export fixes').getByRole('button', { exact: true, name: q.rowActions }).click();
  await page.getByRole('dialog').getByRole('button', { name: q.menuRemove }).click();

  const confirm = page.getByRole('dialog').filter({ hasText: q.removeEpicConfirm });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: en.common.confirm }).click();

  await expect(team.getByText('Fiscal export fixes', { exact: true })).toHaveCount(0);
  await expect(team.getByRole('button', { name: 'Linus Torvalds, Delivery, 19.10–30.10' })).toHaveCount(0);
});

/**
 * Гонку «правка до перечитывания плана затирает откат» здесь не воспроизвести: в демо план перечитывается
 * мгновенно. Её держит unit-тест в features/quarterly-plan/useQuarterlyPlan.test.tsx.
 */
test('TC-124: версия из истории восстанавливается, следующая правка идёт поверх неё', async ({ page }) => {
  const team = await openRoadmap(page);
  await addDirection(team, 'Onboarding');

  await page.getByRole('button', { name: q.history.title }).click();
  await page.getByRole('button', { name: /^October 15 / }).click();
  await expect(page.getByText(q.history.previewHint)).toBeVisible();
  // Превью — только чтение: на доске версия до новой правки.
  await expect(team.getByRole('button', { exact: true, name: 'Onboarding' })).toHaveCount(0);

  await page.getByRole('button', { name: q.history.restore }).click();
  await expect(page.getByText(q.history.restored)).toBeVisible();
  await page.getByRole('button', { name: q.history.close }).click();
  await expect(team.getByRole('button', { exact: true, name: 'Onboarding' })).toHaveCount(0);

  // Следующая правка строится на восстановленной версии, а не на той, что была до отката.
  await addDirection(team, 'Hiring');
  await expect(team.getByRole('button', { exact: true, name: 'Onboarding' })).toHaveCount(0);
  await page.getByRole('button', { name: q.history.title }).click();
  await expect(page.getByRole('button', { name: /Current version .*Directions \+1/ })).toBeVisible();
});
