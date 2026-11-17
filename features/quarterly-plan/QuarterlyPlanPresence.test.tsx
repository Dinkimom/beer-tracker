/** @vitest-environment jsdom */

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { putSprintPresenceFocus } from '@/lib/api/realtime';

import { QuarterlyPlanPresence, useQuarterPresenceTarget } from './QuarterlyPlanPresence';

vi.mock('@/lib/api/realtime', () => ({ putSprintPresenceFocus: vi.fn().mockResolvedValue({ applied: true }) }));
vi.mock('@/hooks/useActiveOrganizationId', () => ({ useActiveOrganizationId: () => 'org' }));

const putMock = vi.mocked(putSprintPresenceFocus);
const QUARTER = { quarter: 4, year: 2026 } as const;

const viewer = (userId: string, focus: SprintPresenceViewer['focus']): SprintPresenceViewer => ({
  avatarUrl: null,
  clientId: `tab-${userId}`,
  displayName: userId,
  focus,
  userId,
});

function renderTarget(viewers: SprintPresenceViewer[], activity: 'dragging' | null = null) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QuarterlyPlanPresence quarterRef={QUARTER} viewers={viewers}>
      {children}
    </QuarterlyPlanPresence>
  );
  return renderHook((props: { activity: 'dragging' | null }) => useQuarterPresenceTarget('bar-1', props.activity), {
    initialProps: { activity },
    wrapper,
  });
}

describe('useQuarterPresenceTarget', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('locks a bar someone else is dragging and leaves a watched one free', () => {
    const dragged = renderTarget([viewer('bob', { state: 'dragging', targetId: 'bar-1' })]);
    expect(dragged.result.current.locked).toBe(true);
    expect(dragged.result.current.ringClass).toBe('sprint-card-presence-changing');

    const watched = renderTarget([viewer('bob', { state: 'viewing', targetId: 'bar-1' })]);
    expect(watched.result.current.locked).toBe(false);

    const elsewhere = renderTarget([viewer('bob', { state: 'dragging', targetId: 'bar-2' })]);
    expect(elsewhere.result.current.locked).toBe(false);
  });

  it('reports own drag to the presence of the quarter and clears it when the gesture ends', async () => {
    const { rerender } = renderTarget([], 'dragging');
    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith(
        expect.objectContaining({ ...QUARTER, focus: { state: 'dragging', targetId: 'bar-1' }, organizationId: 'org' })
      )
    );
    expect(putMock.mock.calls[0]![0]).not.toHaveProperty('sprintId');

    act(() => rerender({ activity: null }));
    await waitFor(() => expect(putMock).toHaveBeenLastCalledWith(expect.objectContaining({ ...QUARTER, focus: null })));
  });
});
