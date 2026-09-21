import { describe, expect, it } from 'vitest';

import {
  PLANNER_IMAGE_COMPRESS_MAX_EDGE,
  compressPlannerImageFile,
  fileNameForPlannerImageType,
  pickCompressedPlannerImage,
  plannerImageOutputType,
  scaledPlannerImageSize,
  shouldSkipPlannerImageCompression,
} from './compressPlannerImageFile';

describe('scaledPlannerImageSize', () => {
  it('keeps images within the max edge', () => {
    expect(scaledPlannerImageSize(800, 600)).toEqual({ height: 600, width: 800 });
    expect(scaledPlannerImageSize(1920, 1080)).toEqual({ height: 1080, width: 1920 });
  });

  it('scales landscape and portrait down to the max edge', () => {
    expect(scaledPlannerImageSize(4000, 2000)).toEqual({
      height: 960,
      width: PLANNER_IMAGE_COMPRESS_MAX_EDGE,
    });
    expect(scaledPlannerImageSize(2000, 4000)).toEqual({
      height: PLANNER_IMAGE_COMPRESS_MAX_EDGE,
      width: 960,
    });
  });
});

describe('planner image compression helpers', () => {
  it('skips gifs so animation is preserved', () => {
    expect(
      shouldSkipPlannerImageCompression(new File([new Uint8Array(8)], 'a.gif', { type: 'image/gif' }))
    ).toBe(true);
    expect(
      shouldSkipPlannerImageCompression(new File([new Uint8Array(8)], 'a.jpg', { type: 'image/jpeg' }))
    ).toBe(false);
  });

  it('encodes photos as jpeg and raster screenshots as webp', () => {
    expect(plannerImageOutputType('image/jpeg')).toBe('image/jpeg');
    expect(plannerImageOutputType('image/png')).toBe('image/webp');
    expect(plannerImageOutputType('image/webp')).toBe('image/webp');
  });

  it('renames the file to match the encoded type', () => {
    expect(fileNameForPlannerImageType('IMG_001.PNG', 'image/webp')).toBe('IMG_001.webp');
    expect(fileNameForPlannerImageType('shot.jpeg', 'image/jpeg')).toBe('shot.jpg');
    expect(fileNameForPlannerImageType('', 'image/jpeg')).toBe('photo.jpg');
  });

  it('keeps the original when compression did not shrink the file', () => {
    const original = new File([new Uint8Array(32)], 'shot.jpg', { type: 'image/jpeg' });
    expect(pickCompressedPlannerImage(original, null)).toBe(original);
    expect(
      pickCompressedPlannerImage(original, new Blob([new Uint8Array(40)], { type: 'image/jpeg' }))
    ).toBe(original);
  });

  it('returns a smaller encoded file when compression helped', () => {
    const original = new File([new Uint8Array(32)], 'shot.png', { type: 'image/png' });
    const next = pickCompressedPlannerImage(
      original,
      new Blob([new Uint8Array(8)], { type: 'image/webp' })
    );
    expect(next).not.toBe(original);
    expect(next.type).toBe('image/webp');
    expect(next.name).toBe('shot.webp');
    expect(next.size).toBe(8);
  });
});

describe('compressPlannerImageFile', () => {
  it('returns animated gifs unchanged', async () => {
    const gif = new File([new Uint8Array(8)], 'a.gif', { type: 'image/gif' });
    await expect(compressPlannerImageFile(gif)).resolves.toBe(gif);
  });

  it('returns the original file when the browser cannot decode it', async () => {
    const jpeg = new File([new Uint8Array(8)], 'a.jpg', { type: 'image/jpeg' });
    await expect(compressPlannerImageFile(jpeg)).resolves.toBe(jpeg);
  });
});
