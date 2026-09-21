import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { enMessages } from '@/lib/i18n/messages/en';
import { analyzeEnglishLeafQuality } from '@/lib/i18n/messages/englishMessageQuality';
import { collectLeafKeys } from '@/lib/i18n/messages/messageTree';
import { ruMessages } from '@/lib/i18n/messages/ru';

const ALLOWLIST_PATH = path.join(process.cwd(), 'scripts/i18n/english-quality-allowlist.json');

interface AllowlistFile {
  allowEmptyKeys?: string[];
  allowPlaceholderKeys?: string[];
}

async function loadAllowlist(): Promise<{ allowEmptyKeys: Set<string>; allowPlaceholderKeys: Set<string> }> {
  try {
    const raw = await readFile(ALLOWLIST_PATH, 'utf8');
    const data = JSON.parse(raw) as AllowlistFile;
    const empty = Array.isArray(data.allowEmptyKeys) ? data.allowEmptyKeys : [];
    const ph = Array.isArray(data.allowPlaceholderKeys) ? data.allowPlaceholderKeys : [];
    return {
      allowEmptyKeys: new Set(empty),
      allowPlaceholderKeys: new Set(ph),
    };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return { allowEmptyKeys: new Set(), allowPlaceholderKeys: new Set() };
    }
    throw e;
  }
}

function checkParity(): boolean {
  const ruKeys = new Set(collectLeafKeys(ruMessages));
  const enKeys = new Set(collectLeafKeys(enMessages));

  const missingInEn = [...ruKeys].filter((k) => !enKeys.has(k)).sort();
  const missingInRu = [...enKeys].filter((k) => !ruKeys.has(k)).sort();

  if (missingInEn.length === 0 && missingInRu.length === 0) {
    console.warn('i18n parity OK: ru/en message catalogs have identical leaf keys.');
    return true;
  }

  console.error('i18n parity FAILED: ru/en message catalogs diverged.');
  if (missingInEn.length > 0) {
    console.error(`Missing in en (${missingInEn.length}):`);
    for (const k of missingInEn) console.error(`- ${k}`);
  }
  if (missingInRu.length > 0) {
    console.error(`Missing in ru (${missingInRu.length}):`);
    for (const k of missingInRu) console.error(`- ${k}`);
  }

  return false;
}

async function main(): Promise<void> {
  const parityOk = checkParity();
  if (!parityOk) {
    process.exitCode = 1;
    return;
  }

  const { allowEmptyKeys, allowPlaceholderKeys } = await loadAllowlist();
  const issues = analyzeEnglishLeafQuality(enMessages, { allowEmptyKeys, allowPlaceholderKeys });

  if (issues.length === 0) {
    console.warn('i18n English quality OK: no empty leaves or obvious TODO/TBD/FIXME placeholders.');
    return;
  }

  console.error(`i18n English quality FAILED (${issues.length} issue(s)).`);
  for (const i of issues) {
    console.error(`- [${i.kind}] ${i.key}: ${i.detail}`);
  }
  console.error(`Allow documented exceptions in ${path.relative(process.cwd(), ALLOWLIST_PATH)}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error('[check:i18n] failed', err);
  process.exitCode = 1;
});
