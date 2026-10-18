import { describe, expect, it } from 'vitest';

import { planPatchCaptionTone } from './PlanPatchPendingToolbar';

describe('planPatchCaptionTone', () => {
  it('marks a removal in red with a delete icon', () => {
    expect(planPatchCaptionTone({ changes: [], remove: true })).toEqual({
      className: 'text-red-600 dark:text-red-400',
      icon: 'trash',
    });
  });

  it('marks an add in green with a plus', () => {
    expect(planPatchCaptionTone({ changes: [], remove: false })).toEqual({
      className: 'text-green-700 dark:text-green-400',
      icon: 'plus',
    });
  });

  it('marks a date move with an arrow', () => {
    expect(planPatchCaptionTone({ changes: ['schedule', 'duration'], remove: false }).icon).toBe(
      'arrow-right'
    );
  });
});
