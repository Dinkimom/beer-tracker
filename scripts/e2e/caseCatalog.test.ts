import { describe, expect, it } from 'vitest';

import { caseIdsInSpec, checkCatalogAgainstRepo, findAffectedCases, parseCaseCatalog } from './caseCatalog';

const CATALOG = `# Каталог

\`\`\`markdown
### TC-NNN: пример формата
\`\`\`

## Раздел

### TC-010: Вкладки
- Контур: демо
- Код: components/Tabs.tsx, features/retro/
- Шаги: открыть.
- Ожидаемо: открылось.
- Автотест: e2e/functional/tabs.spec.ts

### TC-011: Боевой
- Контур: боевой
- Код: lib/sprints/
- Шаги: сделать.
- Ожидаемо: сохранилось.
- Автотест: нет — боевой контур
`;

describe('parseCaseCatalog', () => {
  it('разбирает кейсы и пропускает пример формата', () => {
    const { cases, issues } = parseCaseCatalog(CATALOG);
    expect(issues).toEqual([]);
    expect(cases.map((testCase) => testCase.id)).toEqual(['TC-010', 'TC-011']);
    expect(cases[0]).toMatchObject({
      autotest: 'e2e/functional/tabs.spec.ts',
      code: ['components/Tabs.tsx', 'features/retro/'],
      contour: 'демо',
      title: 'Вкладки',
    });
    expect(cases[1]).toMatchObject({ autotest: null, autotestMissingReason: 'боевой контур' });
  });

  it('ругается на пропущенные поля, повтор номера и демо без причины', () => {
    const { issues } = parseCaseCatalog(
      [
        '### TC-001: A',
        '- Контур: демо',
        '- Код: a/',
        '- Шаги: s',
        '- Ожидаемо: e',
        '- Автотест: нет',
        '### TC-001: B',
        '- Контур: демо',
      ].join('\n'),
    );
    expect(issues.map((issue) => issue.message)).toEqual([
      'TC-001: демо-кейс без автотеста — укажите причину «нет — …»',
      'TC-001: номер уже занят',
      'TC-001: нет полей Код, Шаги, Ожидаемо, Автотест',
    ]);
  });
});

describe('caseIdsInSpec', () => {
  it('раскрывает составные номера', () => {
    expect(caseIdsInSpec("test('TC-040/041: цели', async () => {});\ntest(`TC-010: x`)")).toEqual([
      'TC-040',
      'TC-041',
      'TC-010',
    ]);
  });
});

describe('checkCatalogAgainstRepo', () => {
  const { cases } = parseCaseCatalog(CATALOG);

  it('молчит, когда всё сходится', () => {
    const specs = new Map([['e2e/functional/tabs.spec.ts', "test('TC-010: вкладки', () => {})"]]);
    expect(checkCatalogAgainstRepo(cases, { exists: () => true, specs })).toEqual([]);
  });

  it('находит битые пути, тест без кейса и кейс без теста', () => {
    const specs = new Map([
      ['e2e/functional/tabs.spec.ts', "test('TC-099: другое', () => {})"],
      ['e2e/functional/other.spec.ts', "test('TC-011: не там', () => {})"],
    ]);
    const messages = checkCatalogAgainstRepo(cases, {
      exists: (path) => path !== 'features/retro/',
      specs,
    }).map((issue) => issue.message);
    expect(messages).toEqual([
      'TC-010: путь из «Код» не существует — features/retro/',
      'TC-010: в e2e/functional/tabs.spec.ts нет теста с названием «TC-010…»',
      'e2e/functional/tabs.spec.ts: тест ссылается на TC-099, которого нет в каталоге',
      'TC-011: тест есть в e2e/functional/other.spec.ts, а в «Автотест» — нет',
    ]);
  });
});

describe('findAffectedCases', () => {
  const { cases } = parseCaseCatalog(CATALOG);

  it('сопоставляет папки по префиксу, файлы — точно, и отдаёт UI-файлы без кейса', () => {
    const report = findAffectedCases(cases, [
      'features/retro/components/RetroPage.tsx',
      'components/Tabs.tsx',
      'components/TabsOther.tsx',
      'components/Tabs.test.tsx',
      'app/api/sprints/route.ts',
      'lib/sprints/repo.ts',
    ]);
    expect(report.affected.map(({ files, testCase }) => [testCase.id, files])).toEqual([
      ['TC-010', ['features/retro/components/RetroPage.tsx', 'components/Tabs.tsx']],
      ['TC-011', ['lib/sprints/repo.ts']],
    ]);
    expect(report.uncovered).toEqual(['components/TabsOther.tsx']);
  });
});
