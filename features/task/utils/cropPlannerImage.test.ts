import { describe, expect, it } from 'vitest';

import {
  applyCropInteraction,
  canCropPlannerImageFile,
  clampNormalizedCropRect,
  clientDeltaToNormalized,
  cropAndCompressPlannerImageFile,
  cropOverlayBands,
  displayCropFromNormalized,
  FULL_NORMALIZED_CROP_RECT,
  isFullNormalizedCropRect,
  isPlannerImageCropperOpen,
  objectContainRect,
  pixelCropFromNormalized,
  shouldSkipPlannerImageCrop,
} from './cropPlannerImage';

describe('clampNormalizedCropRect', () => {
  it('keeps a valid rect unchanged', () => {
    expect(clampNormalizedCropRect({ height: 0.4, width: 0.5, x: 0.2, y: 0.1 })).toEqual({
      height: 0.4,
      width: 0.5,
      x: 0.2,
      y: 0.1,
    });
  });

  it('clamps overflow back into the image', () => {
    expect(clampNormalizedCropRect({ height: 0.4, width: 0.5, x: 0.8, y: 0.9 })).toEqual({
      height: 0.4,
      width: 0.5,
      x: 0.5,
      y: 0.6,
    });
  });
});

describe('isFullNormalizedCropRect', () => {
  it('treats the default rect as full', () => {
    expect(isFullNormalizedCropRect(FULL_NORMALIZED_CROP_RECT)).toBe(true);
    expect(isFullNormalizedCropRect({ height: 0.5, width: 1, x: 0, y: 0 })).toBe(false);
  });
});

describe('applyCropInteraction', () => {
  const start = { height: 0.4, width: 0.4, x: 0.3, y: 0.3 };

  it('moves the rect without resizing', () => {
    expect(applyCropInteraction(start, 'move', 0.1, -0.1)).toEqual({
      height: 0.4,
      width: 0.4,
      x: 0.4,
      y: 0.2,
    });
  });

  it('resizes from the south-east handle', () => {
    expect(applyCropInteraction(start, 'se', 0.1, 0.1)).toEqual({
      height: 0.5,
      width: 0.5,
      x: 0.3,
      y: 0.3,
    });
  });

  it('resizes from the north-west handle', () => {
    expect(applyCropInteraction(start, 'nw', 0.1, 0.1)).toEqual({
      height: 0.3,
      width: 0.3,
      x: 0.4,
      y: 0.4,
    });
  });
});

describe('objectContainRect', () => {
  it('letterboxes a landscape image in a square', () => {
    expect(objectContainRect(200, 200, 400, 200)).toEqual({
      height: 100,
      width: 200,
      x: 0,
      y: 50,
    });
  });

  it('returns an empty box when sizes are missing', () => {
    expect(objectContainRect(0, 100, 10, 10)).toEqual({ height: 0, width: 0, x: 0, y: 0 });
  });
});

describe('displayCropFromNormalized', () => {
  it('maps a normalized rect onto the contained image', () => {
    const contain = { height: 100, width: 200, x: 10, y: 20 };
    expect(displayCropFromNormalized({ height: 0.5, width: 0.5, x: 0.25, y: 0.25 }, contain)).toEqual(
      {
        height: 50,
        width: 100,
        x: 60,
        y: 45,
      }
    );
  });
});

describe('clientDeltaToNormalized', () => {
  it('scales pointer movement by the contained image size', () => {
    expect(clientDeltaToNormalized(20, 10, 200, 100)).toEqual({ dx: 0.1, dy: 0.1 });
    expect(clientDeltaToNormalized(10, 10, 0, 0)).toEqual({ dx: 0, dy: 0 });
  });
});

describe('cropOverlayBands', () => {
  it('covers the area around the crop window', () => {
    const bands = cropOverlayBands(
      { height: 40, width: 40, x: 30, y: 20 },
      { height: 80, width: 100, x: 0, y: 0 }
    );
    expect(bands).toHaveLength(4);
    expect(bands[0]).toEqual({ height: 20, width: 100, x: 0, y: 0 });
    expect(bands[1]).toEqual({ height: 20, width: 100, x: 0, y: 60 });
    expect(bands[2]).toEqual({ height: 40, width: 30, x: 0, y: 20 });
    expect(bands[3]).toEqual({ height: 40, width: 30, x: 70, y: 20 });
  });
});

describe('pixelCropFromNormalized', () => {
  it('rounds a centered crop to source pixels', () => {
    expect(pixelCropFromNormalized({ height: 0.5, width: 0.5, x: 0.25, y: 0.25 }, 100, 80)).toEqual({
      height: 40,
      sx: 25,
      sy: 20,
      width: 50,
    });
  });
});

describe('shouldSkipPlannerImageCrop', () => {
  it('skips animated gifs and allows still photos', () => {
    expect(
      shouldSkipPlannerImageCrop(new File([new Uint8Array(8)], 'a.gif', { type: 'image/gif' }))
    ).toBe(true);
    expect(
      canCropPlannerImageFile(new File([new Uint8Array(8)], 'a.gif', { type: 'image/gif' }))
    ).toBe(false);
    expect(
      canCropPlannerImageFile(new File([new Uint8Array(8)], 'a.jpg', { type: 'image/jpeg' }))
    ).toBe(true);
  });
});

describe('isPlannerImageCropperOpen', () => {
  it('is false when the cropper is not mounted', () => {
    expect(isPlannerImageCropperOpen()).toBe(false);
  });
});

describe('cropAndCompressPlannerImageFile', () => {
  it('returns animated gifs unchanged', async () => {
    const gif = new File([new Uint8Array(8)], 'a.gif', { type: 'image/gif' });
    await expect(cropAndCompressPlannerImageFile(gif, FULL_NORMALIZED_CROP_RECT)).resolves.toBe(gif);
  });

  it('falls back to compression when the crop is the full image', async () => {
    const jpeg = new File([new Uint8Array(8)], 'a.jpg', { type: 'image/jpeg' });
    await expect(cropAndCompressPlannerImageFile(jpeg, FULL_NORMALIZED_CROP_RECT)).resolves.toBe(
      jpeg
    );
  });
});
