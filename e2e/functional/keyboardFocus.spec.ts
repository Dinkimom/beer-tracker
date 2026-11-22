import type { Locator } from '@playwright/test';

import { en, expect, openDemoPlanner, test } from '../fixtures';

/** Кольцо фокуса — `outline` (app/globals.css, `--ds-focus-ring`); после клика мышью его нет. */
function outlineOf(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).outlineStyle);
}

test('TC-130: фокус с клавиатуры виден, после клика мышью кольца нет', async ({ page }) => {
  await openDemoPlanner(page);
  const tabs = page.getByRole('navigation', { name: en.header.accessibility.sprintTabsNavigation });
  const backlog = tabs.getByRole('button', { exact: true, name: en.header.sprintTabs.backlog });
  const roadmap = tabs.getByRole('button', { exact: true, name: en.header.sprintTabs.quarter });

  await backlog.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(backlog).toBeFocused();
  await expect.poll(() => outlineOf(backlog)).toBe('solid');

  await roadmap.click();
  await expect(roadmap).toBeFocused();
  await expect.poll(() => outlineOf(roadmap)).toBe('none');
});
