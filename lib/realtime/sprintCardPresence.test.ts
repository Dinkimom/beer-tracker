import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  collectDepartedSprintCardPresenceViewers,
  mergeSprintCardPresenceAvatarSlots,
  nextSprintCardPresenceAvatarOrderKeys,
  nextSprintCardPresenceAvatarState,
  nextSprintCardPresenceExitingViewers,
  resolveSprintCardPresenceFocus,
  sprintCardPresenceBlocksNewGestures,
  sprintCardPresenceHasChangingViewer,
  sprintCardPresenceIsLockedByRemote,
  sprintCardPresenceLocksTarget,
  sprintCardPresencePublishDelayMs,
  sprintCardPresenceViewers,
  SPRINT_CARD_PRESENCE_VIEWING_DEBOUNCE_MS,
  sprintPresenceFocusEquals,
} from './sprintCardPresence';
import { sprintPresenceViewerReactKey } from './sprintPresenceCollapse';

const ada = {
  avatarUrl: null,
  clientId: 'tab-a',
  displayName: 'Ada',
  focus: { state: 'viewing' as const, targetId: 'BT-1' },
  userId: 'u1',
};

describe('sprintCardPresence', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('treats missing focus as equal', () => {
    expect(sprintPresenceFocusEquals(undefined, null)).toBe(true);
    expect(sprintPresenceFocusEquals({ state: 'viewing', targetId: 'a' }, { state: 'viewing', targetId: 'a' })).toBe(
      true
    );
    expect(sprintPresenceFocusEquals({ state: 'viewing', targetId: 'a' }, { state: 'dragging', targetId: 'a' })).toBe(
      false
    );
  });

  it('prefers dragging over looking', () => {
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: 'BT-2',
        draggingTaskId: 'BT-1',
        hoveredTaskId: 'BT-3',
      })
    ).toEqual({ state: 'dragging', targetId: 'BT-1' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: 'BT-2',
        draggingTaskId: null,
        hoveredTaskId: 'BT-3',
        resizingTaskId: 'BT-4',
      })
    ).toEqual({ state: 'resizing', targetId: 'BT-4' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: 'BT-2',
        draggingTaskId: 'BT-1',
        hoveredTaskId: 'BT-3',
        resizingTaskId: 'BT-4',
      })
    ).toEqual({ state: 'dragging', targetId: 'BT-1' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: 'BT-2',
        draggingTaskId: null,
        editingTaskId: 'comment:1',
        hoveredTaskId: 'BT-3',
      })
    ).toEqual({ state: 'editing', targetId: 'comment:1' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: 'BT-2',
        draggingTaskId: 'BT-1',
        editingTaskId: 'comment:1',
        hoveredTaskId: 'BT-3',
      })
    ).toEqual({ state: 'dragging', targetId: 'BT-1' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: 'BT-2',
        draggingTaskId: null,
        hoveredTaskId: 'BT-3',
        linkingTaskId: 'BT-9',
      })
    ).toEqual({ state: 'linking', targetId: 'BT-9' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: 'BT-2',
        draggingTaskId: null,
        hoveredTaskId: 'BT-3',
      })
    ).toEqual({ state: 'viewing', targetId: 'BT-2' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: null,
        draggingTaskId: null,
        hoveredTaskId: 'BT-3',
      })
    ).toEqual({ state: 'viewing', targetId: 'BT-3' });
    expect(
      resolveSprintCardPresenceFocus({
        contextMenuTaskId: null,
        draggingTaskId: null,
        hoveredTaskId: null,
      })
    ).toBeNull();
  });

  it('hides this tab on the card and collapses the same person', () => {
    expect(sprintCardPresenceViewers([ada], 'BT-1', 'tab-a')).toEqual([]);
    expect(
      sprintCardPresenceViewers(
        [
          ada,
          { ...ada, clientId: 'tab-b', focus: { state: 'dragging', targetId: 'BT-1' } },
          { ...ada, userId: 'u2', clientId: 'tab-c', displayName: 'Bob' },
        ],
        'BT-1',
        'tab-a'
      )
    ).toEqual([
      { ...ada, clientId: 'tab-b', focus: { state: 'dragging', targetId: 'BT-1' } },
      { ...ada, userId: 'u2', clientId: 'tab-c', displayName: 'Bob' },
    ]);
  });

  it('hides this tab on the card in development as well', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(sprintCardPresenceViewers([ada], 'BT-1', 'tab-a')).toEqual([]);
    vi.unstubAllEnvs();
  });

  it('publishes drag immediately and debounces looking / clear', () => {
    expect(sprintCardPresencePublishDelayMs('dragging:BT-1')).toBe(0);
    expect(sprintCardPresencePublishDelayMs('resizing:BT-1')).toBe(0);
    expect(sprintCardPresencePublishDelayMs('editing:comment:1')).toBe(0);
    expect(sprintCardPresencePublishDelayMs('linking:BT-1')).toBe(0);
    expect(sprintCardPresencePublishDelayMs('viewing:BT-1')).toBe(SPRINT_CARD_PRESENCE_VIEWING_DEBOUNCE_MS);
    expect(sprintCardPresencePublishDelayMs('')).toBe(SPRINT_CARD_PRESENCE_VIEWING_DEBOUNCE_MS);
  });

  it('treats dragging focus as a changing presence on the card', () => {
    expect(sprintCardPresenceHasChangingViewer([ada])).toBe(false);
    expect(
      sprintCardPresenceHasChangingViewer([{ ...ada, focus: { state: 'dragging', targetId: 'BT-1' } }])
    ).toBe(true);
    expect(
      sprintCardPresenceHasChangingViewer([{ ...ada, focus: { state: 'resizing', targetId: 'BT-1' } }])
    ).toBe(true);
    expect(
      sprintCardPresenceHasChangingViewer([{ ...ada, focus: { state: 'editing', targetId: 'BT-1' } }])
    ).toBe(true);
    expect(
      sprintCardPresenceHasChangingViewer([{ ...ada, focus: { state: 'linking', targetId: 'BT-1' } }])
    ).toBe(false);
    expect(
      sprintCardPresenceHasChangingViewer([
        ada,
        {
          ...ada,
          clientId: 'tab-c',
          displayName: 'Bob',
          focus: { state: 'dragging', targetId: 'BT-1' },
          userId: 'u2',
        },
      ])
    ).toBe(true);
  });

  it('locks the card for others while someone is changing it, but not this tab', () => {
    const bobChanging = {
      ...ada,
      clientId: 'tab-c',
      displayName: 'Bob',
      focus: { state: 'dragging' as const, targetId: 'BT-1' },
      userId: 'u2',
    };
    expect(sprintCardPresenceIsLockedByRemote([ada], 'tab-a')).toBe(false);
    expect(sprintCardPresenceIsLockedByRemote([bobChanging], 'tab-a')).toBe(true);
    expect(
      sprintCardPresenceIsLockedByRemote(
        [{ ...bobChanging, focus: { state: 'editing', targetId: 'BT-1' } }],
        'tab-a'
      )
    ).toBe(true);
    expect(sprintCardPresenceIsLockedByRemote([bobChanging], 'tab-c')).toBe(false);
    expect(sprintCardPresenceLocksTarget([bobChanging], 'BT-1', 'tab-a')).toBe(true);
    expect(sprintCardPresenceLocksTarget([bobChanging], 'BT-2', 'tab-a')).toBe(false);
    expect(sprintCardPresenceLocksTarget([bobChanging], '', 'tab-a')).toBe(false);
    expect(sprintCardPresenceBlocksNewGestures(true, false)).toBe(true);
    expect(sprintCardPresenceBlocksNewGestures(true, true)).toBe(false);
    expect(sprintCardPresenceBlocksNewGestures(false, false)).toBe(false);
  });

  it('keeps viewers that left until the exit animation can finish', () => {
    const bob = { ...ada, userId: 'u2', clientId: 'tab-c', displayName: 'Bob' };
    expect(collectDepartedSprintCardPresenceViewers([ada, bob], [ada])).toEqual([bob]);
    expect(collectDepartedSprintCardPresenceViewers([ada], [ada])).toEqual([]);
    expect(collectDepartedSprintCardPresenceViewers([ada], [])).toEqual([ada]);
    expect(
      nextSprintCardPresenceExitingViewers({
        departedFrom: [ada],
        exiting: [],
        nextLive: [],
        reducedMotion: false,
      })
    ).toEqual([ada]);
    expect(
      nextSprintCardPresenceExitingViewers({
        departedFrom: [ada],
        exiting: [ada],
        nextLive: [],
        reducedMotion: true,
      })
    ).toEqual([]);
  });

  it('keeps a departing avatar in its stack slot instead of appending it', () => {
    const bob = { ...ada, userId: 'u2', clientId: 'tab-c', displayName: 'Bob' };
    expect(
      nextSprintCardPresenceAvatarOrderKeys({
        exitingKeys: ['bob'],
        liveKeys: ['ada'],
        previousOrder: ['ada', 'bob'],
      })
    ).toEqual(['ada', 'bob']);
    expect(
      mergeSprintCardPresenceAvatarSlots({
        exiting: [bob],
        liveShown: [ada],
        orderKeys: [sprintPresenceViewerReactKey(ada), sprintPresenceViewerReactKey(bob)],
      })
    ).toEqual([
      { exiting: false, viewer: ada },
      { exiting: true, viewer: bob },
    ]);
  });

  it('appends a newly visible avatar after the current stack', () => {
    const bob = { ...ada, userId: 'u2', clientId: 'tab-c', displayName: 'Bob' };
    const adaKey = sprintPresenceViewerReactKey(ada);
    const bobKey = sprintPresenceViewerReactKey(bob);
    const next = nextSprintCardPresenceAvatarState({
      live: [bob, ada],
      previousExiting: [],
      previousLive: [ada],
      previousOrderKeys: [adaKey],
      reducedMotion: false,
      visibleCap: 3,
    });
    expect(next.orderKeys).toEqual([adaKey, bobKey]);
    expect(next.exiting).toEqual([]);
  });
});
