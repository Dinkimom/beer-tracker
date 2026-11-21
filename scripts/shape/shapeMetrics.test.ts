import { describe, expect, it } from 'vitest';

import { SHAPE_LIMITS, compareWithBaseline, countCodeLines, measureFileShape, toBaseline } from './shapeMetrics';

function propsInterface(name: string, width: number): string {
  const fields = Array.from({ length: width }, (_, i) => `  field${i}: string;`).join('\n');
  return `interface ${name} {\n${fields}\n}\n`;
}

function forwardingComponent(attrs: number, passThrough: number): string {
  const props = Array.from({ length: passThrough }, (_, i) => `a${i}`);
  const forwarded = props.map((name) => `${name}={${name}}`);
  const own = Array.from({ length: attrs - passThrough }, (_, i) => `b${i}={compute(${i})}`);
  return `export function Layer({ ${props.join(', ')} }: LayerProps) {\n  return <Child ${[...forwarded, ...own].join(' ')} />;\n}\n`;
}

describe('measureFileShape', () => {
  it('flags Props wider than the limit, counting own fields of type literals too', () => {
    const wide = propsInterface('WideProps', SHAPE_LIMITS.maxPropsWidth + 1);
    const narrow = propsInterface('NarrowProps', SHAPE_LIMITS.maxPropsWidth);
    const alias = `type AliasProps = Base & { ${Array.from({ length: 21 }, (_, i) => `x${i}: number;`).join(' ')} };`;
    const found = measureFileShape('features/a/A.tsx', `${wide}${narrow}${alias}`);
    expect(found.map((v) => [v.metric, v.name, v.value])).toEqual([
      ['props-width', 'WideProps', 21],
      ['props-width', 'AliasProps', 21],
    ]);
  });

  it('ignores interfaces that are not component props', () => {
    expect(measureFileShape('lib/a.ts', propsInterface('SprintRow', 40))).toEqual([]);
  });

  it('flags a component that mostly forwards props, but not a small one', () => {
    expect(measureFileShape('features/a/Layer.tsx', forwardingComponent(20, 15))).toEqual([
      { file: 'features/a/Layer.tsx', metric: 'pass-through', name: '', value: 75 },
    ]);
    expect(measureFileShape('features/a/Layer.tsx', forwardingComponent(20, 10))).toEqual([]);
    expect(measureFileShape('features/a/Small.tsx', forwardingComponent(10, 10))).toEqual([]);
  });

  it('counts fields of a received slice as pass-through, but not computed locals', () => {
    const slice = Array.from({ length: 15 }, (_, i) => `on${i}={handlers.handle${i}}`).join(' ');
    const locals = Array.from({ length: 15 }, (_, i) => `c${i}={c${i}}`).join(' ');
    const own = Array.from({ length: 5 }, (_, i) => `d${i}={compute(${i})}`).join(' ');
    const component = (attrs: string) =>
      `function View({ handlers }: ViewProps) {\n  ${Array.from({ length: 15 }, (_, i) => `const c${i} = compute(${i});`).join('\n  ')}\n  return <Child ${attrs} />;\n}\n`;
    expect(measureFileShape('features/a/View.tsx', component(`${slice} ${own}`))).toEqual([
      { file: 'features/a/View.tsx', metric: 'pass-through', name: '', value: 75 },
    ]);
    expect(measureFileShape('features/a/View.tsx', component(`${locals} ${own}`))).toEqual([]);
  });

  it('flags only hook files over the line limit', () => {
    const body = Array.from({ length: SHAPE_LIMITS.maxHookLines + 1 }, (_, i) => `const v${i} = ${i};`).join('\n');
    expect(measureFileShape('hooks/useBig.ts', body)).toEqual([
      { file: 'hooks/useBig.ts', metric: 'hook-lines', name: '', value: SHAPE_LIMITS.maxHookLines + 1 },
    ]);
    expect(measureFileShape('lib/big.ts', body)).toEqual([]);
  });
});

describe('countCodeLines', () => {
  it('skips blank lines and comments', () => {
    expect(countCodeLines('// a\n\n/**\n * doc\n */\nconst a = 1;\n/* x */\nconst b = 2;')).toBe(2);
  });
});

describe('compareWithBaseline', () => {
  const wide = { file: 'f.tsx', metric: 'props-width' as const, name: 'P', value: 30 };

  it('fails on new and grown violations, reports shrunk and fixed ones', () => {
    const baseline = toBaseline([wide, { file: 'g.ts', metric: 'hook-lines', name: '', value: 400 }]);
    const result = compareWithBaseline(
      [
        { ...wide, value: 31 },
        { file: 'h.tsx', metric: 'pass-through', name: '', value: 80 },
      ],
      baseline
    );
    expect(result.added.map((v) => v.file)).toEqual(['h.tsx']);
    expect(result.grown).toEqual([{ ...wide, baseline: 30, value: 31 }]);
    expect(result.improved).toEqual(['g.ts::hook-lines']);
  });

  it('accepts unchanged debt and lists shrunk entries as improved', () => {
    const result = compareWithBaseline([{ ...wide, value: 25 }], toBaseline([wide]));
    expect(result.added).toEqual([]);
    expect(result.grown).toEqual([]);
    expect(result.improved).toEqual(['f.tsx::props-width::P']);
  });
});
