import { describe, expect, it } from 'vitest';

import {
  getQuarterlyDevelopmentPlanParentKind,
  isQuarterlyPlannerDevelopmentPlanRow,
} from './quarterlyDevelopmentPlanRow';

describe('quarterlyDevelopmentPlanRow', () => {
  it('story under epic', () => {
    expect(
      getQuarterlyDevelopmentPlanParentKind({
        type: 'story',
        parent: { id: 'E-1', key: 'E-1', display: 'Epic' },
      })
    ).toBe('story');
  });

  it('epic row without parent', () => {
    expect(
      getQuarterlyDevelopmentPlanParentKind({ type: 'epic', parent: undefined })
    ).toBe('epic');
  });

  it('standalone story in plan', () => {
    expect(
      getQuarterlyDevelopmentPlanParentKind({ type: 'story', parent: undefined })
    ).toBe('story');
  });

  it('isQuarterlyPlannerDevelopmentPlanRow for epic and story', () => {
    expect(isQuarterlyPlannerDevelopmentPlanRow({ type: 'epic' })).toBe(true);
    expect(
      isQuarterlyPlannerDevelopmentPlanRow({
        type: 'story',
        parent: { id: 'E-1', key: 'E-1', display: 'Epic' },
      })
    ).toBe(true);
  });
});
