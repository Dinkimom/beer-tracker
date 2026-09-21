import { describe, expect, it } from 'vitest';

import { resolveOccupancyLinkOutlineVisibility } from './occupancyLinkBlockOutlineHelpers';

describe('resolveOccupancyLinkOutlineVisibility', () => {
  it('always shows the source ring', () => {
    expect(
      resolveOccupancyLinkOutlineVisibility({
        isHoveringThisRowPhase: false,
        rowIsLinkSource: true,
        rowIsLinkTarget: false,
      })
    ).toEqual({ showSourceRing: true, showTargetHover: false });
  });

  it('shows the target outline only while hovering a valid target', () => {
    expect(
      resolveOccupancyLinkOutlineVisibility({
        isHoveringThisRowPhase: false,
        rowIsLinkSource: false,
        rowIsLinkTarget: true,
      })
    ).toEqual({ showSourceRing: false, showTargetHover: false });
    expect(
      resolveOccupancyLinkOutlineVisibility({
        isHoveringThisRowPhase: true,
        rowIsLinkSource: false,
        rowIsLinkTarget: true,
      })
    ).toEqual({ showSourceRing: false, showTargetHover: true });
  });
});
