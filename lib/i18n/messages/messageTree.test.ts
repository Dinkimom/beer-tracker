import { describe, expect, it } from 'vitest';

import {
  collectLeafKeys,
  flattenMessagesToDotMap,
  formatMessagesModule,
  mergeDotStringMapIntoMessages,
  quoteTsString,
} from './messageTree';

describe('messageTree', () => {
  it('escapes single quotes and backslashes', () => {
    expect(quoteTsString("'")).toBe("'\\''");
    expect(quoteTsString('\\')).toBe("'\\\\'");
  });

  it('flattens and merges without changing leaf keys', () => {
    const base = {
      a: { x: '1', y: '2' },
      b: '3',
    } as const;
    const flat = flattenMessagesToDotMap(base);
    expect(flat).toMatchObject({ 'a.x': '1', 'a.y': '2', b: '3' });
    const merged = mergeDotStringMapIntoMessages(base as unknown as Record<string, unknown>, {
      'a.x': '9',
    });
    expect(collectLeafKeys(merged).sort()).toEqual(collectLeafKeys(base).sort());
    expect((merged as { a: { x: string } }).a.x).toBe('9');
    expect((merged as { a: { y: string } }).a.y).toBe('2');
  });

  it('formats a small module preserving key order and as const', () => {
    const src = formatMessagesModule('enMessages', { z: 'last', a: { n: 'x' } } as Record<string, unknown>);
    expect(src).toContain('export const enMessages = {');
    expect(src).toContain('} as const;');
    expect(src.indexOf('z:')).toBeLessThan(src.indexOf('a:'));
  });
});
