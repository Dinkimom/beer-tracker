/**
 * Каталог тест-кейсов docs/TEST_CASES.md: разбор, сверка со спеками e2e/ и поиск кейсов, задетых diff.
 * Чистые функции — файловую систему и git трогают CLI `check-cases.ts` и `affected.ts`.
 */

type CaseContour = 'боевой' | 'демо';

interface TestCase {
  /** `e2e/...spec.ts` или null, если автотеста нет. */
  autotest: string | null;
  /** Причина из «нет — …». */
  autotestMissingReason: string | null;
  code: string[];
  contour: CaseContour;
  id: string;
  line: number;
  title: string;
}

interface CatalogIssue {
  line: number;
  message: string;
}

const HEADING = /^### (TC-\d{3}): (.+)$/;
const FIELD = /^- (Контур|Код|Шаги|Ожидаемо|Автотест): (.*)$/;
const REQUIRED_FIELDS = ['Контур', 'Код', 'Шаги', 'Ожидаемо', 'Автотест'] as const;
const NO_AUTOTEST = /^нет(?:\s+—\s+(.*))?$/;

interface Draft {
  fields: Map<string, string>;
  id: string;
  line: number;
  title: string;
}

function finishDraft(draft: Draft, issues: CatalogIssue[]): TestCase | null {
  const missing = REQUIRED_FIELDS.filter((field) => !draft.fields.get(field));
  if (missing.length > 0) {
    issues.push({ line: draft.line, message: `${draft.id}: нет полей ${missing.join(', ')}` });
    return null;
  }
  const contour = draft.fields.get('Контур');
  if (contour !== 'демо' && contour !== 'боевой') {
    issues.push({ line: draft.line, message: `${draft.id}: Контур — «демо» или «боевой», а не «${contour}»` });
    return null;
  }
  const autotestRaw = draft.fields.get('Автотест')!;
  const none = NO_AUTOTEST.exec(autotestRaw);
  const reason = none?.[1]?.trim() || null;
  if (none && contour === 'демо' && !reason) {
    issues.push({ line: draft.line, message: `${draft.id}: демо-кейс без автотеста — укажите причину «нет — …»` });
  }
  return {
    autotest: none ? null : autotestRaw.trim(),
    autotestMissingReason: reason,
    code: draft.fields
      .get('Код')!
      .split(',')
      .map((path) => path.trim())
      .filter(Boolean),
    contour,
    id: draft.id,
    line: draft.line,
    title: draft.title,
  };
}

/** Разбирает каталог. Блок примера формата (внутри ``` … ```) пропускается. */
export function parseCaseCatalog(markdown: string): { cases: TestCase[]; issues: CatalogIssue[] } {
  const cases: TestCase[] = [];
  const issues: CatalogIssue[] = [];
  const seen = new Set<string>();
  let draft: Draft | null = null;
  let inFence = false;

  const flush = () => {
    if (!draft) return;
    const parsed = finishDraft(draft, issues);
    if (parsed) cases.push(parsed);
    draft = null;
  };

  markdown.split('\n').forEach((text, index) => {
    const line = index + 1;
    if (text.startsWith('```')) inFence = !inFence;
    if (inFence) return;
    const heading = HEADING.exec(text);
    if (heading) {
      flush();
      if (seen.has(heading[1])) issues.push({ line, message: `${heading[1]}: номер уже занят` });
      seen.add(heading[1]);
      draft = { fields: new Map(), id: heading[1], line, title: heading[2].trim() };
      return;
    }
    if (text.startsWith('#')) {
      flush();
      return;
    }
    const field = draft ? FIELD.exec(text) : null;
    if (draft && field) (draft as Draft).fields.set(field[1], field[2].trim());
  });
  flush();
  return { cases, issues };
}

/** Номера кейсов из названий тестов спеки: `test('TC-040/041: …'` → TC-040, TC-041. */
export function caseIdsInSpec(source: string): string[] {
  const ids: string[] = [];
  for (const match of source.matchAll(/test\(\s*['"`]TC-(\d{3}(?:\/\d{3})*)\b/g)) {
    for (const number of match[1].split('/')) ids.push(`TC-${number}`);
  }
  return ids;
}

interface CatalogFs {
  /** Спеки e2e: путь от корня репозитория → исходник. */
  specs: Map<string, string>;
  exists(path: string): boolean;
}

/** Сверяет каталог с кодом и спеками: битые пути, спеки без кейса, кейсы без теста в своей спеке. */
export function checkCatalogAgainstRepo(cases: TestCase[], fs: CatalogFs): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const byId = new Map(cases.map((testCase) => [testCase.id, testCase]));

  for (const testCase of cases) {
    for (const path of testCase.code) {
      if (!fs.exists(path)) {
        issues.push({ line: testCase.line, message: `${testCase.id}: путь из «Код» не существует — ${path}` });
      }
    }
    if (!testCase.autotest) continue;
    const source = fs.specs.get(testCase.autotest);
    if (source === undefined) {
      issues.push({ line: testCase.line, message: `${testCase.id}: спеки нет — ${testCase.autotest}` });
    } else if (!caseIdsInSpec(source).includes(testCase.id)) {
      issues.push({
        line: testCase.line,
        message: `${testCase.id}: в ${testCase.autotest} нет теста с названием «${testCase.id}…»`,
      });
    }
  }

  for (const [specPath, source] of fs.specs) {
    for (const id of caseIdsInSpec(source)) {
      const testCase = byId.get(id);
      if (!testCase) {
        issues.push({ line: 0, message: `${specPath}: тест ссылается на ${id}, которого нет в каталоге` });
      } else if (testCase.autotest !== specPath) {
        issues.push({
          line: testCase.line,
          message: `${id}: тест есть в ${specPath}, а в «Автотест» — ${testCase.autotest ?? 'нет'}`,
        });
      }
    }
  }
  return issues;
}

/** Файлы, изменение которых может поменять поведение для пользователя, — для них ожидается кейс. */
function isUserFacingSource(path: string): boolean {
  if (!/\.(tsx?|css)$/.test(path)) return false;
  if (/\.(test|spec|stories)\.tsx?$/.test(path) || path.endsWith('.d.ts')) return false;
  if (path.startsWith('app/api/')) return false;
  return /^(app|components|features)\//.test(path);
}

function matchesCode(file: string, codePath: string): boolean {
  return codePath.endsWith('/') ? file.startsWith(codePath) : file === codePath;
}

interface AffectedReport {
  affected: { files: string[]; testCase: TestCase }[];
  /** Изменённые UI-файлы, которых нет ни в одном кейсе. */
  uncovered: string[];
}

/** Кейсы, чей «Код» задет изменёнными файлами, и UI-файлы без кейса. */
export function findAffectedCases(cases: TestCase[], changedFiles: string[]): AffectedReport {
  const filesByCase = new Map<string, string[]>();
  const uncovered: string[] = [];
  for (const file of changedFiles) {
    const hits = cases.filter((testCase) => testCase.code.some((codePath) => matchesCode(file, codePath)));
    for (const testCase of hits) filesByCase.set(testCase.id, [...(filesByCase.get(testCase.id) ?? []), file]);
    if (hits.length === 0 && isUserFacingSource(file)) uncovered.push(file);
  }
  const affected = cases
    .filter((testCase) => filesByCase.has(testCase.id))
    .map((testCase) => ({ files: filesByCase.get(testCase.id)!, testCase }));
  return { affected, uncovered };
}
