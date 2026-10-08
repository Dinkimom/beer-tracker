import { describe, expect, it } from 'vitest';

import {
  BACKLOG_SECTION_DROP,
  BACKLOG_SECTION_IDLE,
  resolveBacklogSectionChromeClass,
} from './backlogChromeClasses';

describe('resolveBacklogSectionChromeClass', () => {
  it('uses drop chrome when highlighted', () => {
    expect(resolveBacklogSectionChromeClass(true)).toBe(BACKLOG_SECTION_DROP);
  });

  it('uses idle chrome otherwise', () => {
    expect(resolveBacklogSectionChromeClass(false)).toBe(BACKLOG_SECTION_IDLE);
  });
});
