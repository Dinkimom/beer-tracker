/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  PlannerOnboardingReplayBridge,
  usePlannerOnboardingReplayAction,
  useRegisterPlannerOnboardingReplay,
} from './PlannerOnboardingReplayBridge';

describe('PlannerOnboardingReplayBridge', () => {
  it('exposes replay only while the planner host is registered', () => {
    const replay = vi.fn();
    const { result, rerender } = renderHook(
      ({ action }: { action: (() => void) | null }) => {
        useRegisterPlannerOnboardingReplay(action);
        return usePlannerOnboardingReplayAction();
      },
      {
        initialProps: { action: null as (() => void) | null },
        wrapper: PlannerOnboardingReplayBridge,
      }
    );

    expect(result.current).toBeNull();

    rerender({ action: replay });
    expect(result.current).toBe(replay);

    act(() => {
      result.current?.();
    });
    expect(replay).toHaveBeenCalledOnce();

    rerender({ action: null });
    expect(result.current).toBeNull();
  });
});
