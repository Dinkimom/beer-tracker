import { describe, expect, it } from 'vitest';

import {
  photoPointerExceededDragThreshold,
  shouldOpenPhotoLightboxAfterPointerUp,
} from './taskBarPhotoGestureHelpers';

function mockClickTarget(): HTMLElement {
  return { closest: () => null } as unknown as HTMLElement;
}

describe('taskBarPhotoGestureHelpers', () => {
  it('treats movement below drag threshold as a click', () => {
    expect(
      shouldOpenPhotoLightboxAfterPointerUp({
        clickStartPos: { x: 10, y: 10 },
        clientX: 14,
        clientY: 11,
        effectiveIsDragging: false,
        isResizing: false,
        suppressOpen: false,
        target: mockClickTarget(),
      })
    ).toBe(true);
  });

  it('blocks lightbox after drag-sized movement', () => {
    expect(
      shouldOpenPhotoLightboxAfterPointerUp({
        clickStartPos: { x: 10, y: 10 },
        clientX: 20,
        clientY: 10,
        effectiveIsDragging: false,
        isResizing: false,
        suppressOpen: false,
        target: mockClickTarget(),
      })
    ).toBe(false);
  });

  it('blocks lightbox when drag already started or was suppressed', () => {
    expect(
      shouldOpenPhotoLightboxAfterPointerUp({
        clickStartPos: { x: 0, y: 0 },
        clientX: 0,
        clientY: 0,
        effectiveIsDragging: true,
        isResizing: false,
        suppressOpen: false,
        target: mockClickTarget(),
      })
    ).toBe(false);
    expect(
      shouldOpenPhotoLightboxAfterPointerUp({
        clickStartPos: { x: 0, y: 0 },
        clientX: 0,
        clientY: 0,
        effectiveIsDragging: false,
        isResizing: false,
        suppressOpen: true,
        target: mockClickTarget(),
      })
    ).toBe(false);
  });

  it('uses the same threshold helper for pointer tracking', () => {
    expect(photoPointerExceededDragThreshold({ x: 0, y: 0 }, 7, 0)).toBe(false);
    expect(photoPointerExceededDragThreshold({ x: 0, y: 0 }, 8, 0)).toBe(true);
  });
});
