// Записывает анимации посадочной (README) с /demo/planner в docs/media/<clip>-<theme>.webp.
// Кадры — цикл CDP-скриншотов @2x, сборка — img2webp (libwebp). Запуск — см. SKILL.md.
//
//   node record.cjs [--base http://localhost:3000] [--out docs/media] [--only drag-resize,retro] [--themes light,dark]
//                   [--frames <dir>]   — ещё и полные JPEG-кадры в <dir>/<clip>-<theme>/ для проверки глазами

/* global Buffer, console, process, localStorage, document, window -- Node-скрипт; DOM — внутри addInitScript */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const VIEWPORT = { width: 1440, height: 900 };
/** @2x, как у скринов: на ретине и при увеличении @1x мылится. */
const SCALE = 2;
/**
 * Честный @2x скриншотом снимается ~5 кадров/с. Поэтому сценарий идёт в SLOWDOWN раз медленнее
 * (мышь, паузы, набор, CSS-анимации), а при сборке длительности кадров делятся обратно: ~20 кадров/с.
 */
const SLOWDOWN = 6;
const HOLD_START_MS = 800;
const HOLD_END_MS = 1500;
const STEP_MS = 16;

/** Нарисованный курсор: в headless системного нет. При нажатии сжимается. */
function installCursor() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">' +
    '<path d="M3 2l7 19 2.6-8.2L21 10z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const mount = () => {
    const el = document.createElement('div');
    el.id = '__landing-cursor';
    el.innerHTML = svg;
    el.style.cssText =
      'position:fixed;left:0;top:0;width:32px;height:32px;z-index:2147483647;pointer-events:none;' +
      'transform-origin:4px 3px;transition:transform 80ms ease-out;transform:translate(-100px,-100px)';
    document.body.appendChild(el);
    let x = -100;
    let y = -100;
    let scale = 1;
    const paint = () => {
      el.style.transform = `translate(${x - 4}px, ${y - 3}px) scale(${scale})`;
    };
    window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; paint(); }, true);
    window.addEventListener('pointerdown', () => { scale = 0.82; paint(); }, true);
    window.addEventListener('pointerup', () => { scale = 1; paint(); }, true);
  };
  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Мышь и клавиатура с памятью позиции: плавные перемещения, всё время — в темпе ролика. */
function createPointer(page) {
  let at = { x: VIEWPORT.width / 2, y: VIEWPORT.height - 40 };
  const wait = (ms) => page.waitForTimeout(ms * SLOWDOWN);
  // Прогресс — по часам, а не по числу шагов: пока идёт скриншот, CDP-вызовы мыши ждут в очереди.
  const glide = async (to, ms = 600) => {
    const from = at;
    const total = ms * SLOWDOWN;
    const start = Date.now();
    for (let k = 0; k < 1; ) {
      k = Math.min(1, (Date.now() - start) / total);
      const e = ease(k);
      await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      await page.waitForTimeout(STEP_MS);
    }
    at = to;
  };
  return {
    glide,
    async drag(from, to, ms = 900) {
      await glide(from);
      await wait(250);
      await page.mouse.down();
      await wait(150);
      await glide(to, ms);
      await wait(250);
      await page.mouse.up();
    },
    async click(to) {
      await glide(to);
      await wait(200);
      await page.mouse.down();
      await wait(90);
      await page.mouse.up();
    },
    async type(text, delay = 40) {
      const start = Date.now();
      for (const [i, char] of [...text].entries()) {
        await page.waitForTimeout(Math.max(0, start + i * delay * SLOWDOWN - Date.now()));
        await page.keyboard.type(char);
      }
    },
    pause: wait,
  };
}

async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`no box for ${locator}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Сценарии. tab — подпись вкладки в шапке; run получает page и pointer. */
const CLIPS = [
  {
    clip: 'drag-resize',
    tab: 'Board',
    async run(page, p) {
      const card = await center(page.getByText('Mobile: Apple Pay button').first());
      const grab = { x: card.box.x + 60, y: card.y };
      await p.drag(grab, { x: grab.x - 270, y: grab.y + 95 }, 1100);
      await p.pause(700);
      // Правый край: ручка ресайза проявляется после ховера (~150 мс).
      const handle = page
        .locator('[data-task-id]', { hasText: 'Mobile: Apple Pay button' })
        .locator('.task-bar-resize-handle-hit')
        .first();
      const edge = await center(handle);
      await p.glide(edge);
      await p.pause(400);
      await p.drag(edge, { x: edge.x - 260, y: edge.y }, 900);
      await p.pause(400);
    },
  },
  {
    clip: 'link',
    tab: 'Board',
    async run(page, p) {
      await p.click(await center(page.getByRole('button', { name: /^Link \(/ })));
      await p.pause(300);
      await p.click(await center(page.getByText('Receipt email template').first()));
      await p.pause(300);
      await p.click(await center(page.getByText('Mobile: Apple Pay button').first()));
      await p.pause(500);
      await p.click(await center(page.getByRole('button', { name: /^Cursor \(/ })));
      // Связи relates рисуются при наведении на карточку (после короткой задержки).
      await p.glide(await center(page.getByText('Receipt email template').first()), 900);
      await p.pause(1600);
    },
  },
  {
    clip: 'note',
    tab: 'Board',
    async run(page, p) {
      await p.click(await center(page.getByRole('button', { name: /^Note \(/ })));
      await p.pause(300);
      // Пустая ячейка в общей строке сверху: кнопка «+» оживает после ховера.
      await p.glide({ x: 950, y: 210 }, 800);
      await p.pause(300);
      await p.click({ x: 950, y: 210 });
      await p.pause(300);
      // Черновик шириной в слот: сначала растягиваем, фокус остаётся в редакторе.
      const edge = await center(page.locator('[data-task-id^="local-task-"] .task-bar-resize-handle-hit').first());
      await p.glide(edge, 400);
      await p.pause(300);
      await p.drag(edge, { x: edge.x + 300, y: edge.y }, 800);
      await p.glide({ x: 1180, y: 300 }, 400);
      // Строка свимлейна вмещает две строки текста заметки.
      await p.type('[ ] Smoke test on staging', 40);
      await page.keyboard.press('Enter');
      await p.type('Ping the payments team', 40);
      await p.pause(400);
      await p.click(await center(page.locator('[data-swimlane-draft-save] button[aria-label="Confirm"]')));
      await p.pause(500);
      await p.click(await center(page.getByRole('button', { name: /^Cursor \(/ })));
      await p.glide({ x: 1250, y: 560 }, 600);
      await p.pause(900);
    },
  },
  {
    clip: 'retro',
    tab: 'Retro',
    async run(page, p) {
      const add = page.getByRole('button', { name: 'Add a card' });
      await p.click(await center(add.nth(1)));
      await p.pause(300);
      await p.type('Demo board made planning quick', 40);
      await page.keyboard.press('Enter');
      await p.pause(600);
      await p.click(await center(add.nth(2)));
      await p.pause(300);
      await p.type('Too many tasks carried over', 40);
      await page.keyboard.press('Enter');
      await p.glide({ x: 700, y: 640 }, 600);
      await p.pause(900);
    },
  },
];

function parseArgs(argv) {
  const args = { base: 'http://localhost:3000', out: 'docs/media', only: null, themes: ['light', 'dark'] };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    args[key] = key === 'only' || key === 'themes' ? value.split(',') : value;
  }
  return args;
}

function assemble(frames, file) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-clip-'));
  const cli = ['-loop', '0', '-lossy', '-q', '62', '-m', '4', '-mixed'];
  frames.forEach((frame, i) => {
    const name = path.join(dir, `${String(i).padStart(4, '0')}.jpg`);
    fs.writeFileSync(name, frame.image);
    cli.push('-d', String(frame.ms), name);
  });
  execFileSync('img2webp', [...cli, '-o', file], { stdio: 'ignore' });
  fs.rmSync(dir, { recursive: true, force: true });
}

async function record(browser, args, spec, theme) {
  const storage = {
    'beer-tracker-language': 'en',
    'beer-tracker-theme': theme,
    'beer-tracker-sidebar-open': false,
    'beer-tracker-planner-onboarding': { tourCompleted: true },
  };
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  await context.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, storage);
  await context.addInitScript(installCursor);
  const page = await context.newPage();
  // networkidle ненадёжен: dev-сервер держит HMR-соединение. Ждём вкладку в шапке.
  await page.goto(`${args.base}/demo/planner`, { waitUntil: 'load' });
  // Плашка Dev Tools и тултипы: в замедленном времени тултип успевает всплыть и закрыть жест.
  await page.addStyleTag({ content: 'nextjs-portal, [role="tooltip"] { display: none !important; }' });
  await page.locator('button', { hasText: new RegExp(`^${spec.tab}$`) }).first().click({ timeout: 60000 });
  // Курсор уходит со вкладки в стартовую точку до записи, иначе в первом кадре он прыгает.
  const pointer = createPointer(page);
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height - 40, { steps: 5 });
  await page.waitForTimeout(2500);

  // Screencast отдаёт кадры только в CSS-пикселях, поэтому @2x — цикл скриншотов в замедленном времени.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOWDOWN });
  const clip = { x: 0, y: 0, ...VIEWPORT, scale: SCALE };
  const raw = [];
  let recording = true;
  const capture = (async () => {
    while (recording) {
      const t = Date.now();
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 92,
        optimizeForSpeed: true,
        clip,
      });
      raw.push({ image: Buffer.from(data, 'base64'), t });
    }
  })();
  await pointer.pause(HOLD_START_MS);
  await spec.run(page, pointer);
  await pointer.pause(300);
  recording = false;
  await capture;
  await context.close();

  const frames = raw.map((f, i) => ({
    image: f.image,
    ms: raw[i + 1] ? Math.round((raw[i + 1].t - f.t) / SLOWDOWN) : HOLD_END_MS,
  }));
  const file = path.join(args.out, `${spec.clip}-${theme}.webp`);
  assemble(frames, file);
  if (args.frames) {
    // Полные кадры для просмотра: в WebP они хранятся дельтами.
    const dir = path.join(args.frames, `${spec.clip}-${theme}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    frames.forEach((f, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), f.image));
  }
  console.log(file, `${frames.length} frames`, `${Math.round(fs.statSync(file).size / 1024)} KB`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const clips = args.only ? CLIPS.filter((c) => args.only.includes(c.clip)) : CLIPS;
  const browser = await chromium.launch();
  try {
    for (const spec of clips) {
      for (const theme of args.themes) {
        await record(browser, args, spec, theme);
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
