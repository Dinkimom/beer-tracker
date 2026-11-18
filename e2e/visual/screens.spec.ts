import { expect, openDemoPlanner, openSprintTab, SPRINT_TABS, test, type Theme } from '../fixtures';

/**
 * Визуальный регресс: каждый экран шапки демо-планера в светлой и тёмной теме.
 * Эталоны — e2e/visual/__screenshots__, снимаются только в Linux-образе Playwright (`pnpm e2e:visual:update`):
 * шрифты и сглаживание macOS дают другие пиксели. Вне Linux тест пропускается.
 */
test.skip(process.platform !== 'linux', 'визуальные эталоны — из Linux-образа: pnpm e2e:visual');
test.use({ frozenClock: true });

const THEMES: Theme[] = ['light', 'dark'];

for (const theme of THEMES) {
  test.describe(theme, () => {
    test.use({ theme });

    for (const tab of SPRINT_TABS) {
      test(`${tab}`, async ({ page }) => {
        await openDemoPlanner(page);
        if (tab !== 'board') await openSprintTab(page, tab);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        // Курсор в угол: hover-подсветка карточек и тултипы в кадр не идут.
        await page.mouse.move(0, 0);
        await expect(page).toHaveScreenshot(`${tab}-${theme}.png`);
      });
    }
  });
}
