import { describe, expect, it } from 'vitest';

import { resolveTransitionStatusColorClasses } from './transitionStatusColors';

describe('resolveTransitionStatusColorClasses', () => {
  it('uses known status-key palette (blocked stays red despite inProgress type)', () => {
    const c = resolveTransitionStatusColorClasses('blocked', 'inProgress', null);
    expect(c.bg).toContain('bg-red-100');
    expect(c.border).toContain('border-red-300');
  });

  it('falls back to status type for Cyrillic / unknown keys', () => {
    const testing = resolveTransitionStatusColorClasses('тестирование', 'inProgress', null);
    expect(testing.bg).toContain('bg-blue-100');

    const done = resolveTransitionStatusColorClasses('readyfordeploy', 'done', null);
    expect(done.bg).toContain('bg-green-100');
  });

  it('prefers visualToken override from integration', () => {
    const c = resolveTransitionStatusColorClasses('тестирование', 'inProgress', {
      тестирование: { visualToken: 'intesting' },
    });
    expect(c.bg).toContain('bg-yellow-100');
  });

  it('matches id-keyed visualToken overrides via alternateKeys', () => {
    const c = resolveTransitionStatusColorClasses(
      'blocked',
      'inProgress',
      { '10009': { visualToken: 'review' } },
      ['10009']
    );
    expect(c.bg).toContain('bg-pink');
  });
});
