#!/usr/bin/env node
/**
 * Статическая сборка демо `/demo/planner` для GitHub Pages (https://dinkimom.github.io/beer-tracker/).
 *
 * Export Next не собирает серверные маршруты (`app/api`, вход, админка, proxy), поэтому скрипт
 * УДАЛЯЕТ их из рабочего дерева перед `next build`. Запускать только в одноразовой копии:
 * в CI (workflow `demo-pages.yml`) или с `--force` в отдельном worktree. Результат — `out/`.
 *
 *   node scripts/demo-pages/build.mjs [--force]
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const force = process.argv.includes('--force');

if (!process.env.CI && !force) {
  console.error(
    'demo-pages: скрипт удаляет серверные маршруты из рабочего дерева. ' +
      'Запускайте в CI или в отдельном worktree с --force.'
  );
  process.exit(1);
}

/** Что из `app/` нужно демо; остальное (маршруты с сервером) убираем. */
const APP_KEEP = new Set(['demo', 'fonts', 'favicon.ico', 'forbidden.tsx', 'globals.css', 'layout.tsx', 'ThemeProvider.tsx']);

const appDir = join(root, 'app');
for (const entry of readdirSync(appDir)) {
  if (!APP_KEEP.has(entry)) {
    rmSync(join(appDir, entry), { force: true, recursive: true });
  }
}
rmSync(join(root, 'proxy.ts'), { force: true });

// В обычной сборке демо рендерится по запросу; в export страница статическая.
const demoPage = join(appDir, 'demo/planner/page.tsx');
writeFileSync(
  demoPage,
  readFileSync(demoPage, 'utf8').replace(/^export const dynamic = 'force-dynamic';\n/m, '')
);

execSync('sh scripts/release/with-app-version.sh next build', {
  env: { ...process.env, BEER_TRACKER_STATIC_DEMO: '1', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
});

const out = join(root, 'out');
if (!existsSync(join(out, 'demo/planner/index.html'))) {
  console.error('demo-pages: нет out/demo/planner/index.html — сборка не дала страницу демо.');
  process.exit(1);
}

// Корень сайта ведёт сразу в демо; .nojekyll — чтобы Pages отдавал папку `_next`.
writeFileSync(
  join(out, 'index.html'),
  '<!doctype html><meta charset="utf-8"><title>Beer Tracker — demo</title>' +
    '<meta http-equiv="refresh" content="0; url=demo/planner/">' +
    '<a href="demo/planner/">Beer Tracker demo</a>\n'
);
writeFileSync(join(out, '.nojekyll'), '');
console.log('demo-pages: готово — out/demo/planner/index.html');
