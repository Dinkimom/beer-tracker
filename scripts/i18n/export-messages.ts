/**
 * Export ru/en message leaf keys to a deterministic JSON file for offline translation / TMS.
 *
 * Usage: `pnpm i18n:export -- --out ./messages-i18n.export.json`
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { enMessages } from '@/lib/i18n/messages/en';
import { flattenMessagesToDotMap } from '@/lib/i18n/messages/messageTree';
import { ruMessages } from '@/lib/i18n/messages/ru';

function sortFlatRecord(rec: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(rec).sort()) {
    sorted[k] = rec[k];
  }
  return sorted;
}

function parseOutPath(argv: string[]): string {
  const i = argv.indexOf('--out');
  if (i >= 0 && argv[i + 1]) {
    return path.resolve(process.cwd(), argv[i + 1]);
  }
  return path.resolve(process.cwd(), 'messages-i18n.export.json');
}

async function main(): Promise<void> {
  const outPath = parseOutPath(process.argv.slice(2));
  const enFlat = sortFlatRecord(flattenMessagesToDotMap(enMessages));
  const ruFlat = sortFlatRecord(flattenMessagesToDotMap(ruMessages));

  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    locales: {
      en: enFlat,
      ru: ruFlat,
    },
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.warn(`[i18n:export] wrote ${Object.keys(enFlat).length} keys per locale → ${outPath}`);
}

main().catch((err) => {
  console.error('[i18n:export] failed', err);
  process.exitCode = 1;
});
