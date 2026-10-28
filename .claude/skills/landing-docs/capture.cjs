// Снимает кадры посадочной (README) с /demo/planner в docs/media/<slot>-<theme>.png.
// Запуск — см. SKILL.md (playwright подтягивается через npx, в зависимости проекта не входит).
//
//   node capture.cjs [--base http://localhost:3000] [--out docs/media] [--only backlog,metrics] [--themes light,dark]

/* global console, process, localStorage -- Node-скрипт; localStorage — внутри addInitScript в браузере */

const path = require('node:path');
const { chromium } = require('playwright');

const VIEWPORT = { width: 1680, height: 1050 };
const SCALE = 2;
const SETTLE_MS = 2500;

/** Слоты из docs/media/README.md. tab — подпись вкладки в шапке на английском. */
const SHOTS = [
  { slot: 'backlog', tab: 'Backlog' },
  { slot: 'burndown', tab: 'Burndown' },
  { slot: 'metrics', tab: 'Metrics' },
  {
    slot: 'fact-timeline',
    tab: 'Board',
    storage: { 'beer-tracker-swimlane-fact-timeline-visible': true },
  },
  { slot: 'collaboration', tab: 'Board', clipHeight: 532 },
];

function parseArgs(argv) {
  const args = { base: 'http://localhost:3000', out: 'docs/media', only: null, themes: ['light', 'dark'] };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    if (key === 'only' || key === 'themes') {
      args[key] = value.split(',');
    } else {
      args[key] = value;
    }
  }
  return args;
}

async function capture(browser, args, shot, theme) {
  const storage = {
    'beer-tracker-language': 'en',
    'beer-tracker-theme': theme,
    'beer-tracker-sidebar-open': false,
    'beer-tracker-planner-onboarding': { tourCompleted: true },
    ...shot.storage,
  };
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  await context.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, storage);
  const page = await context.newPage();
  await page.goto(`${args.base}/demo/planner`, { waitUntil: 'networkidle' });
  // Плашка Next.js Dev Tools в кадр не идёт.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  // По видимому тексту: у части вкладок aria-label длиннее подписи («Burndown Chart»).
  await page.locator('button', { hasText: new RegExp(`^${shot.tab}$`) }).first().click();
  await page.waitForLoadState('networkidle');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE_MS);

  const file = path.join(args.out, `${shot.slot}-${theme}.png`);
  const clip = shot.clipHeight ? { x: 0, y: 0, width: VIEWPORT.width, height: shot.clipHeight } : undefined;
  await page.screenshot({ path: file, clip });
  await context.close();
  console.log(file);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const shots = args.only ? SHOTS.filter((s) => args.only.includes(s.slot)) : SHOTS;
  const browser = await chromium.launch();
  try {
    for (const shot of shots) {
      for (const theme of args.themes) {
        await capture(browser, args, shot, theme);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
