import { describe, expect, it } from 'vitest';

import { resolveSwimlanePinControlVisibilityClass } from './SwimlanePinControl';

describe('resolveSwimlanePinControlVisibilityClass', () => {
  it('keeps an active pin visible', () => {
    expect(resolveSwimlanePinControlVisibilityClass(true)).toBe('opacity-100');
  });

  it('hides an inactive pin while the swimlane row is being resized', () => {
    expect(resolveSwimlanePinControlVisibilityClass(false)).toContain(
      'swimlane-row-resizing:!opacity-0'
    );
  });
});
