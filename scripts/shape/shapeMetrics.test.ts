import { describe, expect, it } from 'vitest';

import { SHAPE_LIMITS, compareWithBaseline, measureFileShape, toBaseline } from './shapeMetrics';

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

});

describe('hook width', () => {
  const fields = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(', ');

  it('flags a hook that takes or returns too many fields', () => {
    const inputs = SHAPE_LIMITS.maxHookInputs + 1;
    const outputs = SHAPE_LIMITS.maxHookOutputs + 1;
    const text = `export function useConductor({ ${fields(inputs, 'a')} }: P) {\n  return { ${fields(outputs, 'a')} };\n}\n`;
    expect(measureFileShape('features/x/useConductor.ts', text)).toEqual([
      { file: 'features/x/useConductor.ts', metric: 'hook-inputs', name: 'useConductor', value: inputs },
      { file: 'features/x/useConductor.ts', metric: 'hook-outputs', name: 'useConductor', value: outputs },
    ]);
  });

  it('counts positional params and arrow hooks; ignores returns of nested functions', () => {
    const positional = Array.from({ length: SHAPE_LIMITS.maxHookInputs + 1 }, (_, i) => `p${i}: number`).join(', ');
    const nested = `{ ${fields(SHAPE_LIMITS.maxHookOutputs + 5, 'x')} }`;
    const text = `export const useArrow = (${positional}) => {\n  const build = () => { return ${nested}; };\n  return { build };\n};\n`;
    expect(measureFileShape('features/x/useArrow.ts', text)).toEqual([
      { file: 'features/x/useArrow.ts', metric: 'hook-inputs', name: 'useArrow', value: SHAPE_LIMITS.maxHookInputs + 1 },
    ]);
  });
});

describe('compareWithBaseline', () => {
  const wide = { file: 'f.tsx', metric: 'props-width' as const, name: 'P', value: 30 };

  it('fails on new and grown violations, reports shrunk and fixed ones', () => {
    const baseline = toBaseline([wide, { file: 'g.ts', metric: 'hook-outputs', name: 'useG', value: 40 }]);
    const result = compareWithBaseline(
      [
        { ...wide, value: 31 },
        { file: 'h.tsx', metric: 'pass-through', name: '', value: 80 },
      ],
      baseline
    );
    expect(result.added.map((v) => v.file)).toEqual(['h.tsx']);
    expect(result.grown).toEqual([{ ...wide, baseline: 30, value: 31 }]);
    expect(result.improved).toEqual(['g.ts::hook-outputs::useG']);
  });

  it('accepts unchanged debt and lists shrunk entries as improved', () => {
    const result = compareWithBaseline([{ ...wide, value: 25 }], toBaseline([wide]));
    expect(result.added).toEqual([]);
    expect(result.grown).toEqual([]);
    expect(result.improved).toEqual(['f.tsx::props-width::P']);
  });
});
