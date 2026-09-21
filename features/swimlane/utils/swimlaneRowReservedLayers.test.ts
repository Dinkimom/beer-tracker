import { describe, expect, it } from 'vitest';

import { SWIMLANE_TASK_ROW_VERTICAL_INSET_PX } from '@/features/swimlane/utils/taskLayerTaskLayout';

import {
  MAX_SWIMLANE_RESERVED_TASK_LAYERS,
  normalizeSwimlaneStoredReservedTaskLayers,
  pointerYToSwimlaneReservedTaskLayers,
  resolveEffectiveSwimlaneReservedTaskLayersPreview,
  resolveSwimlaneBandHeightPxForTaskLayers,
  resolveSwimlaneOneCardHeightPx,
  resolveSwimlaneTaskLayerCountFromBandHeightPx,
} from './swimlaneRowReservedLayers';

const ONE_CARD_HEIGHT_PX = resolveSwimlaneOneCardHeightPx(false);
const SINGLE_ROW_HEIGHT = ONE_CARD_HEIGHT_PX + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;

describe('resolveSwimlaneTaskLayerCountFromBandHeightPx', () => {
  it('returns one layer for the default single row height', () => {
    expect(resolveSwimlaneTaskLayerCountFromBandHeightPx(SINGLE_ROW_HEIGHT, ONE_CARD_HEIGHT_PX)).toBe(
      1
    );
  });

  it('returns three layers for a three-layer band height', () => {
    const height = resolveSwimlaneBandHeightPxForTaskLayers(3, ONE_CARD_HEIGHT_PX);
    expect(resolveSwimlaneTaskLayerCountFromBandHeightPx(height, ONE_CARD_HEIGHT_PX)).toBe(3);
  });
});

describe('pointerYToSwimlaneReservedTaskLayers', () => {
  it('never goes below the content minimum', () => {
    expect(
      pointerYToSwimlaneReservedTaskLayers({
        contentMinTaskLayers: 2,
        oneCardHeightPx: ONE_CARD_HEIGHT_PX,
        pointerYInBandPx: SINGLE_ROW_HEIGHT,
      })
    ).toBe(2);
  });

  it('maps pointer position to a higher reserved layer count', () => {
    const threeLayerHeight = resolveSwimlaneBandHeightPxForTaskLayers(3, ONE_CARD_HEIGHT_PX);
    expect(
      pointerYToSwimlaneReservedTaskLayers({
        contentMinTaskLayers: 1,
        oneCardHeightPx: ONE_CARD_HEIGHT_PX,
        pointerYInBandPx: threeLayerHeight,
      })
    ).toBe(3);
  });
});

describe('normalizeSwimlaneStoredReservedTaskLayers', () => {
  it('clears storage when the user shrinks back to the content minimum', () => {
    expect(normalizeSwimlaneStoredReservedTaskLayers(1, 2)).toBeNull();
    expect(normalizeSwimlaneStoredReservedTaskLayers(2, 2)).toBeNull();
  });

  it('caps stored layers at the global maximum', () => {
    expect(normalizeSwimlaneStoredReservedTaskLayers(99, 1)).toBe(
      MAX_SWIMLANE_RESERVED_TASK_LAYERS
    );
  });
});

describe('resolveEffectiveSwimlaneReservedTaskLayersPreview', () => {
  it('keeps preview after grow commit until storage catches up', () => {
    expect(
      resolveEffectiveSwimlaneReservedTaskLayersPreview({
        contentMaxTaskLayers: 1,
        preview: 3,
        stored: undefined,
      })
    ).toBe(3);
    expect(
      resolveEffectiveSwimlaneReservedTaskLayersPreview({
        contentMaxTaskLayers: 1,
        preview: 3,
        stored: 3,
      })
    ).toBeNull();
  });

  it('keeps preview after shrink commit until storage clears', () => {
    expect(
      resolveEffectiveSwimlaneReservedTaskLayersPreview({
        contentMaxTaskLayers: 1,
        preview: 1,
        stored: 3,
      })
    ).toBe(1);
    expect(
      resolveEffectiveSwimlaneReservedTaskLayersPreview({
        contentMaxTaskLayers: 1,
        preview: 1,
        stored: undefined,
      })
    ).toBeNull();
  });
});
