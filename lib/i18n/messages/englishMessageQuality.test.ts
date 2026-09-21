import { describe, expect, it } from 'vitest';

import { analyzeEnglishLeafQuality } from './englishMessageQuality';

describe('analyzeEnglishLeafQuality', () => {
  it('flags empty and whitespace-only strings', () => {
    const issues = analyzeEnglishLeafQuality({
      a: { x: '', y: '  \t  ' },
      b: 'ok',
    });
    expect(issues.map((i) => i.kind)).toEqual(['empty', 'empty']);
    expect(issues.map((i) => i.key).sort()).toEqual(['a.x', 'a.y']);
  });

  it('flags obvious placeholder-style English', () => {
    const issues = analyzeEnglishLeafQuality({
      a: 'TODO',
      b: 'TBD:',
      c: 'FIXME — later',
      d: 'Not a TODO at start',
    });
    expect(issues.map((i) => i.key).sort()).toEqual(['a', 'b', 'c']);
  });

  it('respects allowlists', () => {
    const issues = analyzeEnglishLeafQuality(
      { a: '', b: 'TODO' },
      {
        allowEmptyKeys: new Set(['a']),
        allowPlaceholderKeys: new Set(['b']),
      }
    );
    expect(issues).toEqual([]);
  });
});
