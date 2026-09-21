import { describe, expect, it } from 'vitest';

import {
  getDiagramCardEmptySlotClass,
  getDiagramCardWellClass,
  getPhotoCardCaptionClass,
  getPhotoCardCaptionColor,
  getPhotoCardDashedGhostStyle,
  getPhotoCardDeleteButtonStyle,
  getPhotoCardEmptySlotClass,
  getPhotoCardPaddingClass,
  getPhotoCardResizeHandlePaint,
  getPhotoCardStyle,
  getPhotoCardSurfaceClasses,
  getPhotoCardWellClass,
  resolveAnnotationWellCursorClass,
} from './photoCardSurface';

describe('getPhotoCardCaptionClass', () => {
  it('keeps the caption in the polaroid footer with the UI sans font', () => {
    const className = getPhotoCardCaptionClass();
    expect(className).toContain('font-sans');
    expect(className).not.toContain('font-excalifont');
    expect(className).not.toContain('absolute');
    expect(className).toContain('mt-2');
    expect(className).toContain('mb-3');
  });
});

describe('getPhotoCardPaddingClass', () => {
  it('uses the same mat on every side with or without a caption', () => {
    expect(getPhotoCardPaddingClass(false)).toBe('!p-2.5');
    expect(getPhotoCardPaddingClass(true)).toBe('!p-2.5');
  });
});

describe('getPhotoCardDashedGhostStyle', () => {
  it('paints a square polaroid ghost with a dashed mat border', () => {
    const style = getPhotoCardDashedGhostStyle(false);
    expect(style.backgroundColor).toBe('#f6f5f2');
    expect(style.borderRadius).toBe(0);
    expect(style.borderStyle).toBe('dashed');
    expect(style.borderWidth).toBe(2);
    expect(style.boxShadow).toBe('none');
  });
});

describe('getPhotoCardStyle', () => {
  it('paints a square off-white instant-photo frame', () => {
    const style = getPhotoCardStyle(false);
    expect(style.backgroundColor).toBe('#f6f5f2');
    expect(style.borderRadius).toBe(0);
    expect(style.borderWidth).toBe(0);
    expect(style.boxShadow).toContain('10px 22px');
  });

  it('keeps a cool paper tone in dark mode', () => {
    const style = getPhotoCardStyle(true);
    expect(style.backgroundColor).toBe('#2c3034');
    expect(style.color).toBe(getPhotoCardCaptionColor(true));
  });
});

describe('getPhotoCardDeleteButtonStyle', () => {
  it('paints the delete chip in the paper color, not sticky-note yellow', () => {
    const style = getPhotoCardDeleteButtonStyle(false);
    expect(style.backgroundColor).toBe('#f6f5f2');
    expect(style.color).toBe('#4a4f54');
    expect(style.backgroundColor).not.toBe('#fef08a');
  });
});

describe('getPhotoCardResizeHandlePaint', () => {
  it('uses a warm ink wash in light mode instead of a blue accent', () => {
    const paint = getPhotoCardResizeHandlePaint(false);
    expect(paint.hoverBackground).toContain('rgba(20, 24, 28');
    expect(paint.line).toContain('rgba(246, 245, 242');
    expect(paint.activeBackground).not.toBe(paint.hoverBackground);
  });
});

describe('getPhotoCardSurfaceClasses', () => {
  it('keeps a square frame and does not clip the drop shadow', () => {
    expect(getPhotoCardSurfaceClasses()).toContain('!rounded-none');
    expect(getPhotoCardSurfaceClasses()).toContain('overflow-visible');
  });
});

describe('getPhotoCardWellClass', () => {
  it('uses a flat black well without a sheen overlay', () => {
    expect(getPhotoCardWellClass()).toContain('overflow-hidden');
    expect(getPhotoCardWellClass()).toContain('bg-black');
    expect(getPhotoCardWellClass()).not.toContain('after:shadow');
  });
});

describe('getPhotoCardEmptySlotClass', () => {
  it('keeps empty-slot copy readable on the dark well', () => {
    expect(getPhotoCardEmptySlotClass()).toContain('text-white/80');
  });
});

describe('getDiagramCardWellClass', () => {
  it('does not use the photo letterbox well', () => {
    expect(getDiagramCardWellClass()).toContain('overflow-hidden');
    expect(getDiagramCardWellClass()).not.toContain('bg-black');
  });
});

describe('resolveAnnotationWellCursorClass', () => {
  it('prefers grab cursors over zoom-in while dragging or resizing', () => {
    expect(
      resolveAnnotationWellCursorClass({ isDragging: true, showZoomCursor: true })
    ).toBe(' cursor-grabbing');
    expect(
      resolveAnnotationWellCursorClass({ isDragging: false, isResizing: true, showZoomCursor: true })
    ).toBe(' cursor-ew-resize');
    expect(
      resolveAnnotationWellCursorClass({ isDragging: false, showZoomCursor: true })
    ).toBe(' cursor-zoom-in');
    expect(
      resolveAnnotationWellCursorClass({ isDragging: false, showZoomCursor: false })
    ).toBe('');
  });
});

describe('getDiagramCardEmptySlotClass', () => {
  it('centers a muted placeholder on a light scene well', () => {
    expect(getDiagramCardEmptySlotClass()).toContain('items-center');
    expect(getDiagramCardEmptySlotClass()).toContain('6965DB');
    expect(getDiagramCardEmptySlotClass()).not.toContain('font-sans');
  });
});
