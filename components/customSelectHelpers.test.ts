import { describe, expect, it } from 'vitest';

import { customSelectClassHasExplicitWidth } from './customSelectHelpers';

describe('customSelectClassHasExplicitWidth', () => {
  it('returns false for empty / min-max only', () => {
    expect(customSelectClassHasExplicitWidth(undefined)).toBe(false);
    expect(customSelectClassHasExplicitWidth('')).toBe(false);
    expect(customSelectClassHasExplicitWidth('min-w-[11rem] max-w-[13rem] shrink-0')).toBe(false);
  });

  it('detects common width utilities', () => {
    expect(customSelectClassHasExplicitWidth('w-[200px] shrink-0')).toBe(true);
    expect(customSelectClassHasExplicitWidth('w-full')).toBe(true);
    expect(customSelectClassHasExplicitWidth('sm:w-[12.5rem]')).toBe(true);
    expect(customSelectClassHasExplicitWidth('!w-auto')).toBe(true);
  });
});
