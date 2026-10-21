import { describe, expect, it } from 'vitest';

import { plannerCommentCardRowSpan, plannerCommentDurationPartsFromWidth } from './plannerCommentCardRow';

describe('plannerCommentDurationPartsFromWidth', () => {
  it('reads small widths as parts and legacy px as px/100', () => {
    expect(plannerCommentDurationPartsFromWidth(3)).toBe(3);
    expect(plannerCommentDurationPartsFromWidth(200)).toBe(2);
    expect(plannerCommentDurationPartsFromWidth(0)).toBe(2);
  });
});

describe('plannerCommentCardRowSpan', () => {
  it('uses stored height for notes and falls back to one row', () => {
    expect(plannerCommentCardRowSpan({ height: 3, kind: 'text', width: 2 })).toBe(3);
    expect(plannerCommentCardRowSpan({ height: 0, kind: 'text', width: 2 })).toBe(1);
    expect(plannerCommentCardRowSpan({ height: 150, kind: 'image', width: 2 })).toBe(1);
  });

  it('pairs diagram height with its width', () => {
    expect(plannerCommentCardRowSpan({ height: 1, kind: 'diagram', width: 4 })).toBe(4);
  });
});
