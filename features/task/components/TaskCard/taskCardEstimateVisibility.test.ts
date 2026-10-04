import { describe, expect, it } from 'vitest';

import { ONBOARDING_SAMPLE_TASK_ID } from '@/lib/plannerOnboarding/onboardingDemoLane';

import { resolveTaskCardEstimateVisibility } from './taskCardEstimateVisibility';

const mapped = { devMapped: true, qaMapped: true };
const unmapped = { devMapped: false, qaMapped: false };

describe('resolveTaskCardEstimateVisibility', () => {
  it('hides both labels until estimate fields are mapped', () => {
    expect(
      resolveTaskCardEstimateVisibility({
        hideTestPoints: false,
        isQATask: false,
        mapping: unmapped,
        showEstimatesSetting: true,
        taskId: 'BT-1',
      })
    ).toEqual({ showPrimaryEstimate: false, showStoryPoints: false, showTestPoints: false });
  });

  it('shows only the mapped estimate', () => {
    expect(
      resolveTaskCardEstimateVisibility({
        hideTestPoints: false,
        isQATask: false,
        mapping: { devMapped: true, qaMapped: false },
        showEstimatesSetting: true,
        taskId: 'BT-1',
      })
    ).toEqual({ showPrimaryEstimate: true, showStoryPoints: true, showTestPoints: false });
  });

  it('shows test points on a QA card only when the QA field is mapped', () => {
    expect(
      resolveTaskCardEstimateVisibility({
        hideTestPoints: false,
        isQATask: true,
        mapping: { devMapped: true, qaMapped: false },
        showEstimatesSetting: true,
        taskId: 'BT-1',
      }).showPrimaryEstimate
    ).toBe(false);
    expect(
      resolveTaskCardEstimateVisibility({
        hideTestPoints: false,
        isQATask: true,
        mapping: mapped,
        showEstimatesSetting: true,
        taskId: 'BT-1',
      })
    ).toMatchObject({ showPrimaryEstimate: true, showTestPoints: true });
  });

  it('falls back to story points for QA cards when test points are hidden by the flow', () => {
    expect(
      resolveTaskCardEstimateVisibility({
        hideTestPoints: true,
        isQATask: true,
        mapping: { devMapped: true, qaMapped: false },
        showEstimatesSetting: true,
        taskId: 'BT-1',
      })
    ).toMatchObject({ showPrimaryEstimate: true, showStoryPoints: true, showTestPoints: false });
  });

  it('hides estimates on the onboarding sample card even when fields are mapped', () => {
    expect(
      resolveTaskCardEstimateVisibility({
        hideTestPoints: false,
        isQATask: false,
        mapping: mapped,
        showEstimatesSetting: true,
        taskId: ONBOARDING_SAMPLE_TASK_ID,
      })
    ).toEqual({ showPrimaryEstimate: false, showStoryPoints: false, showTestPoints: false });
  });
});
