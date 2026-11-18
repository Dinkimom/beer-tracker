import fs from 'node:fs';
import path from 'node:path';

import { expect, openDemoPlanner, openSprintTab, SPRINT_TABS, test, type Theme } from '../fixtures';

import { collectFindings, type Finding } from './detectors';

/**
 * Аудит интерфейса: детекторы (`detectors.ts`) по каждому экрану шапки в обеих темах.
 * Известные проблемы — e2e/audit/known/<экран>-<тема>.json (ключ «правило · элемент» → сколько раз).
 * Падает на новых находках и на исчезнувших (исправил — убери из списка: `pnpm e2e:audit:update`).
 * Только в Linux-образе, как визуальные: обрезка текста зависит от шрифтов.
 */
test.skip(process.platform !== 'linux', 'аудит — в Linux-образе: pnpm e2e:audit');
test.use({ frozenClock: true });
// axe и настоящие наведения по каждому виду кнопки: 5–15 с на экран, под параллельной нагрузкой — дольше.
test.setTimeout(90_000);

const KNOWN_DIR = path.join(__dirname, 'known');
const UPDATE = Boolean(process.env.E2E_AUDIT_UPDATE);
const THEMES: Theme[] = ['light', 'dark'];

type Counts = Record<string, number>;

const keyOf = (finding: Finding) => `${finding.rule} · ${finding.element}`;

function countByKey(findings: Finding[]): Counts {
  const counts: Counts = {};
  for (const finding of findings) counts[keyOf(finding)] = (counts[keyOf(finding)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function readKnown(file: string): Counts {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Counts) : {};
}

for (const theme of THEMES) {
  test.describe(theme, () => {
    test.use({ theme });

    for (const tab of SPRINT_TABS) {
      test(`${tab}`, async ({ page }, testInfo) => {
        await openDemoPlanner(page);
        if (tab !== 'board') await openSprintTab(page, tab);
        await page.waitForLoadState('networkidle');
        await page.mouse.move(0, 0);

        const findings = await collectFindings(page);
        const counts = countByKey(findings);
        const file = path.join(KNOWN_DIR, `${tab}-${theme}.json`);
        await testInfo.attach('findings.json', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' });
        await testInfo.attach('screen.png', { body: await page.screenshot(), contentType: 'image/png' });

        if (UPDATE) {
          fs.mkdirSync(KNOWN_DIR, { recursive: true });
          fs.writeFileSync(file, `${JSON.stringify(counts, null, 2)}\n`);
          return;
        }

        const known = readKnown(file);
        const fresh = findings
          .filter((finding) => (counts[keyOf(finding)] ?? 0) > (known[keyOf(finding)] ?? 0))
          .map((finding) => `${keyOf(finding)} — ${finding.detail}`);
        const gone = Object.keys(known).filter((key) => (counts[key] ?? 0) < known[key]);

        expect([...new Set(fresh)], `новые проблемы интерфейса на ${tab} (${theme})`).toEqual([]);
        expect(gone, `исправлено — убрать из ${path.relative(process.cwd(), file)}: pnpm e2e:audit:update`).toEqual([]);
      });
    }
  });
}
