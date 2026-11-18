/**
 * Сверка каталога docs/TEST_CASES.md с кодом и спеками e2e/ (входит в `pnpm test`).
 * Падает, если формат кейса нарушен, путь из «Код» исчез, спека ссылается на несуществующий кейс
 * или у кейса с автотестом нет теста в указанной спеке.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { checkCatalogAgainstRepo, parseCaseCatalog } from './caseCatalog';

const print = (text: string) => process.stdout.write(`${text}\n`);

const CATALOG = 'docs/TEST_CASES.md';

function collectSpecs(dir: string, specs: Map<string, string>): Map<string, string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__screenshots__') {
      collectSpecs(full, specs);
    } else if (entry.name.endsWith('.spec.ts')) {
      specs.set(full.split(path.sep).join('/'), readFileSync(full, 'utf8'));
    }
  }
  return specs;
}

const { cases, issues } = parseCaseCatalog(readFileSync(CATALOG, 'utf8'));
issues.push(...checkCatalogAgainstRepo(cases, { exists: existsSync, specs: collectSpecs('e2e', new Map()) }));

if (issues.length > 0) {
  for (const issue of issues) console.error(`${CATALOG}:${issue.line} ${issue.message}`);
  console.error(`\n${issues.length} проблем(ы) в каталоге тест-кейсов. Формат — в начале ${CATALOG}.`);
  process.exit(1);
}

const automated = cases.filter((testCase) => testCase.autotest).length;
const demo = cases.filter((testCase) => testCase.contour === 'демо').length;
print(`✓ ${CATALOG}: ${cases.length} кейсов, демо ${demo}, с автотестом ${automated}.`);
