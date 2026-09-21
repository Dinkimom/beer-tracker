/**
 * Merge edited flat locale maps from export JSON back into `lib/i18n/messages/en.ts` / `ru.ts`.
 *
 * Usage: `pnpm i18n:import -- --file ./messages-i18n.export.json`
 * Dry run: add `--dry-run`
 *
 * Only keys present in the JSON are updated; unknown keys fail the import.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { enMessages } from '@/lib/i18n/messages/en';
import {
  collectLeafKeys,
  flattenMessagesToDotMap,
  formatMessagesModule,
  mergeDotStringMapIntoMessages,
} from '@/lib/i18n/messages/messageTree';
import { ruMessages } from '@/lib/i18n/messages/ru';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EN_PATH = path.join(ROOT, 'lib/i18n/messages/en.ts');
const RU_PATH = path.join(ROOT, 'lib/i18n/messages/ru.ts');

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringRecord(value: unknown, label: string): Record<string, string> {
  if (!isPlainRecord(value)) {
    throw new Error(`Expected object for ${label}`);
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== 'string') {
      throw new Error(`Expected string at ${label}.${k}`);
    }
    out[k] = v;
  }
  return out;
}

function assertSameLeafKeys(before: unknown, after: unknown, label: string): void {
  const a = collectLeafKeys(before).sort().join('\n');
  const b = collectLeafKeys(after).sort().join('\n');
  if (a !== b) {
    throw new Error(`Leaf key set changed after merge (${label})`);
  }
}

function parseArgs(argv: string[]): { dryRun: boolean; file?: string } {
  let file: string | undefined;
  const fi = argv.indexOf('--file');
  if (fi >= 0 && argv[fi + 1]) {
    file = path.resolve(process.cwd(), argv[fi + 1]);
  }
  const dryRun = argv.includes('--dry-run');
  return { dryRun, file };
}

function assertKnownKeys(map: Record<string, string>, allowed: Set<string>, label: 'en' | 'ru'): void {
  for (const key of Object.keys(map)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown message key in import (${label}): "${key}"`);
    }
  }
}

async function main(): Promise<void> {
  const { dryRun, file } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Usage: pnpm i18n:import -- --file <export.json> [--dry-run]');
    process.exitCode = 1;
    return;
  }

  const raw = await readFile(file, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isPlainRecord(parsed) || parsed.version !== 1) {
    throw new Error('Expected JSON object with version: 1');
  }
  const localesRaw = parsed.locales;
  if (!localesRaw || !isPlainRecord(localesRaw)) {
    throw new Error('Expected "locales" object');
  }

  const allowed = new Set(collectLeafKeys(ruMessages));

  const enPatchRaw = localesRaw.en;
  const ruPatchRaw = localesRaw.ru;
  const enPatch =
    enPatchRaw !== undefined && isPlainRecord(enPatchRaw)
      ? asStringRecord(enPatchRaw, 'locales.en')
      : {};
  const ruPatch =
    ruPatchRaw !== undefined && isPlainRecord(ruPatchRaw)
      ? asStringRecord(ruPatchRaw, 'locales.ru')
      : {};

  const tasks: Array<{ constName: 'enMessages' | 'ruMessages'; next: unknown; outPath: string }> = [];

  if (Object.keys(enPatch).length > 0) {
    assertKnownKeys(enPatch, allowed, 'en');
    const merged = mergeDotStringMapIntoMessages(
      enMessages as unknown as Record<string, unknown>,
      enPatch
    );
    assertSameLeafKeys(enMessages, merged, 'en');
    tasks.push({ constName: 'enMessages', next: merged, outPath: EN_PATH });
  }
  if (Object.keys(ruPatch).length > 0) {
    assertKnownKeys(ruPatch, allowed, 'ru');
    const merged = mergeDotStringMapIntoMessages(
      ruMessages as unknown as Record<string, unknown>,
      ruPatch
    );
    assertSameLeafKeys(ruMessages, merged, 'ru');
    tasks.push({ constName: 'ruMessages', next: merged, outPath: RU_PATH });
  }

  if (tasks.length === 0) {
    console.warn('[i18n:import] nothing to do: locales.en and locales.ru are empty or missing');
    return;
  }

  for (const { constName, next, outPath } of tasks) {
    const before = flattenMessagesToDotMap(
      constName === 'enMessages' ? enMessages : ruMessages
    );
    const after = flattenMessagesToDotMap(next);
    let changed = 0;
    for (const k of Object.keys(after).sort()) {
      if (before[k] !== after[k]) changed += 1;
    }
    console.warn(`[i18n:import] ${constName}: ${changed} leaf value(s) changed`);
    if (changed === 0) {
      console.warn(`[i18n:import] ${constName}: no text changes, skipping write`);
      continue;
    }
    if (dryRun) continue;
    const source = formatMessagesModule(constName, next as Record<string, unknown>);
    await writeFile(outPath, source, 'utf8');
    console.warn(`[i18n:import] wrote ${outPath}`);
  }

  if (dryRun) {
    console.warn('[i18n:import] dry-run: no files written');
  }
}

main().catch((err) => {
  console.error('[i18n:import] failed', err);
  process.exitCode = 1;
});
