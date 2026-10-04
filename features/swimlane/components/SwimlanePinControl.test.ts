import { describe, expect, it } from 'vitest';

import {
  rectContainsPointer,
  resolveSwimlanePinControlVisibilityClass,
  swimlanePinPlateColor,
} from './SwimlanePinControl';

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

describe('swimlanePinPlateColor', () => {
  it('matches the light and dark hover plates', () => {
    expect(swimlanePinPlateColor(false)).toBe('#f3f4f6');
    expect(swimlanePinPlateColor(true)).toBe('rgb(255 255 255 / 0.1)');
  });
});
describe('rectContainsPointer', () => {
  const rect = { bottom: 40, height: 24, left: 10, right: 34, top: 16, width: 24 };

  it('keeps the plate when the pointer is still inside the control', () => {
    expect(rectContainsPointer(rect, 20, 28)).toBe(true);
  });

  it('drops the plate when the pointer has left the control', () => {
    expect(rectContainsPointer(rect, 0, 0)).toBe(false);
    expect(rectContainsPointer({ ...rect, height: 0, width: 0 }, 20, 28)).toBe(false);
  });
});
