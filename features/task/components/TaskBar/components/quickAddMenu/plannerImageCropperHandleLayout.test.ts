import { describe, expect, it } from 'vitest';

import {
  PLANNER_IMAGE_CROP_HANDLES,
  plannerImageCropHandleClass,
  plannerImageCropMoveClass,
} from './plannerImageCropperHandleLayout';

describe('plannerImageCropperHandleLayout', () => {
  it('places every handle with a resize cursor', () => {
    expect(PLANNER_IMAGE_CROP_HANDLES).toHaveLength(8);
    expect(plannerImageCropHandleClass('se')).toContain('cursor-nwse-resize');
    expect(plannerImageCropHandleClass('n')).toContain('top-0');
    expect(plannerImageCropMoveClass()).toBe('cursor-move');
  });
});
