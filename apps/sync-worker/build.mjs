#!/usr/bin/env node
/**
 * Бандл sync-worker в один Node-файл без Next.js.
 * Запуск: pnpm sync-worker:build
 */
import * as esbuild from 'esbuild';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');

function resolveAtImport(specifier) {
  const base = path.join(repoRoot, specifier.slice(2));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    base,
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return base;
}

await esbuild.build({
  absWorkingDir: repoRoot,
  bundle: true,
  entryPoints: [path.join(repoRoot, 'apps/sync-worker/main.ts')],
  format: 'cjs',
  logLevel: 'info',
  outfile: path.join(repoRoot, 'dist/sync-worker/index.js'),
  platform: 'node',
  plugins: [
    {
      name: 'alias-at',
      setup(build) {
        build.onResolve({ filter: /^@\// }, (args) => ({
          path: resolveAtImport(args.path),
        }));
      },
    },
    {
      name: 'forbid-next',
      setup(build) {
        build.onResolve({ filter: /^next(\/|$)/ }, (args) => ({
          errors: [
            {
              text: `sync-worker must not import Next.js (${args.path} from ${args.importer})`,
            },
          ],
        }));
      },
    },
  ],
  target: 'node20',
});
