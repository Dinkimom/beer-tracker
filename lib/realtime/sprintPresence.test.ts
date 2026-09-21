import type { SprintPresenceViewer } from './sprintRealtimeTypes';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addSprintPresence,
  createSprintPresenceSession,
  removeSprintPresence,
  resetSprintPresenceForTests,
  updateSprintPresenceFocus,
} from './sprintPresence';
import {
  collapseSprintPresenceViewers,
  sprintPresenceAvatarMinCount,
  sprintPresenceHidesOwnTab,
  sprintPresenceViewerReactKey,
  sprintPresenceViewersUiEqual,
} from './sprintPresenceCollapse';

vi.mock('@/lib/env', () => ({
  getRedisUrl: () => undefined,
}));

const ada = { avatarUrl: null, displayName: 'Ada', userId: 'user-a' };
const bob = { avatarUrl: 'https://cdn.example/b.png', displayName: 'Bob', userId: 'user-b' };

describe('sprintPresence', () => {
  afterEach(() => {
    resetSprintPresenceForTests();
    vi.unstubAllEnvs();
  });

  it('hides the current tab and waits for a second person before the header stack', () => {
    expect(sprintPresenceHidesOwnTab()).toBe(true);
    expect(sprintPresenceAvatarMinCount()).toBe(2);
  });

  it('ignores only the local tab gesture when comparing presence UI', () => {
    const own = {
      ...ada,
      clientId: 'tab-a',
      focus: { state: 'dragging' as const, targetId: 'BT-1' },
      gesture: { kind: 'drag' as const, position: { duration: 3, startDay: 0, startPart: 0 } },
    };
    const moved = {
      ...own,
      gesture: { kind: 'drag' as const, position: { duration: 3, startDay: 2, startPart: 1 } },
    };
    const remote = {
      ...bob,
      clientId: 'tab-b',
      focus: { state: 'dragging' as const, targetId: 'BT-2' },
      gesture: { kind: 'drag' as const, position: { duration: 2, startDay: 1, startPart: 0 } },
    };
    expect(sprintPresenceViewersUiEqual([own], [moved], 'tab-a')).toBe(true);
    expect(sprintPresenceViewersUiEqual([own, remote], [moved, remote], 'tab-a')).toBe(true);
    expect(
      sprintPresenceViewersUiEqual(
        [own, remote],
        [
          moved,
          {
            ...remote,
            gesture: { kind: 'drag' as const, position: { duration: 4, startDay: 1, startPart: 0 } },
          },
        ],
        'tab-a'
      )
    ).toBe(false);
  });

  it('collapses several tabs of the same person into one viewer', () => {
    expect(
      collapseSprintPresenceViewers([
        ada,
        { ...ada, displayName: 'Ada Lovelace' },
        bob,
      ])
    ).toEqual([ada, bob]);
  });

  it('keeps the profile with an avatar when another tab only has an id stub', () => {
    const stub = {
      avatarUrl: null,
      displayName: '917cc9fe',
      userId: '917cc9fe-1111-4111-8111-111111111111',
    };
    const photo = {
      avatarUrl: 'https://cdn.example/a.png',
      displayName: 'Ada',
      userId: '917CC9FE-1111-4111-8111-111111111111',
    };
    expect(collapseSprintPresenceViewers([stub, photo])).toEqual([
      { ...photo, userId: '917cc9fe-1111-4111-8111-111111111111' },
    ]);
  });

  it('adds and removes connections in memory when Redis is off', async () => {
    const afterAda = await addSprintPresence('org', 3, 'conn-1', ada);
    expect(afterAda).toEqual([{ ...ada, clientId: 'conn-1' }]);
    const afterBobTab = await addSprintPresence('org', 3, 'conn-2', bob);
    expect(afterBobTab).toEqual([
      { ...ada, clientId: 'conn-1' },
      { ...bob, clientId: 'conn-2' },
    ]);
    const afterAdaSecondTab = await addSprintPresence('org', 3, 'conn-3', ada);
    expect(afterAdaSecondTab).toEqual([
      { ...ada, clientId: 'conn-1' },
      { ...bob, clientId: 'conn-2' },
    ]);
    const afterAdaLeaveOneTab = await removeSprintPresence('org', 3, 'conn-1');
    expect(afterAdaLeaveOneTab).toEqual([
      { ...ada, clientId: 'conn-3' },
      { ...bob, clientId: 'conn-2' },
    ]);
    const afterAdaLeaveAll = await removeSprintPresence('org', 3, 'conn-3');
    expect(afterAdaLeaveAll).toEqual([{ ...bob, clientId: 'conn-2' }]);
    expect(await removeSprintPresence('org', 3, 'conn-2')).toEqual([]);
  });

  it('keeps each browser connection in development so local multi-tab tests work', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(
      collapseSprintPresenceViewers([
        { ...ada, clientId: 'tab-1' },
        { ...ada, clientId: 'tab-2' },
      ])
    ).toEqual([
      { ...ada, clientId: 'tab-1' },
      { ...ada, clientId: 'tab-2' },
    ]);
  });

  it('uses a distinct react key for two browsers of the same user in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const left = { ...ada, clientId: 'tab-1' };
    const right = { ...ada, clientId: 'tab-2' };
    expect(sprintPresenceViewerReactKey(left)).not.toBe(sprintPresenceViewerReactKey(right));
    expect(sprintPresenceViewerReactKey(ada)).toBe(ada.userId);
    vi.unstubAllEnvs();
  });

  it('keeps one stable react key per person in production so the avatar does not remount', () => {
    const left = { ...ada, clientId: 'tab-1' };
    const right = { ...ada, clientId: 'tab-2' };
    expect(sprintPresenceViewerReactKey(left)).toBe(sprintPresenceViewerReactKey(right));
    expect(sprintPresenceViewerReactKey(left)).toBe(ada.userId);
  });

  it('keeps dragging focus when collapsing two tabs of the same person', () => {
    expect(
      collapseSprintPresenceViewers([
        { ...ada, boardView: 'kanban', clientId: 'tab-1', focus: { state: 'viewing', targetId: 'BT-1' } },
        { ...ada, boardView: 'occupancy', clientId: 'tab-2', focus: { state: 'resizing', targetId: 'BT-2' } },
      ])
    ).toEqual([
      {
        ...ada,
        boardView: 'occupancy',
        clientId: 'tab-2',
        focus: { state: 'resizing', targetId: 'BT-2' },
      },
    ]);
  });

  it('publishes fallback presence before a slow registry lookup finishes', async () => {
    let settleLookup!: (viewer: SprintPresenceViewer) => void;
    const lookup = new Promise<SprintPresenceViewer>((resolve) => {
      settleLookup = resolve;
    });
    const session = createSprintPresenceSession({
      connectionId: 'conn-1',
      organizationId: 'org',
      sprintId: 3,
      viewer: ada,
      resolveViewer: () => lookup,
    });
    session.start();
    await vi.waitFor(async () => {
      const snapshot = await addSprintPresence('org', 3, 'probe', bob);
      expect(snapshot.some((viewer) => viewer.userId === 'user-a')).toBe(true);
    });
    settleLookup({ ...ada, avatarUrl: 'https://cdn.example/a.png', displayName: 'Ada Lovelace' });
    await vi.waitFor(async () => {
      const snapshot = await addSprintPresence('org', 3, 'probe', bob);
      expect(snapshot.find((viewer) => viewer.userId === 'user-a')?.displayName).toBe('Ada Lovelace');
    });
    session.cancel();
  });

  it('updates card focus for an existing connection', async () => {
    await addSprintPresence('org', 3, 'conn-1', ada);
    expect(await updateSprintPresenceFocus('org', 3, 'missing', { state: 'viewing', targetId: 'BT-1' })).toBe(
      'missing'
    );
    expect(await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'viewing', targetId: 'BT-1' })).toBe(
      'updated'
    );
    expect(await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'viewing', targetId: 'BT-1' })).toBe(
      'unchanged'
    );
    expect(await updateSprintPresenceFocus('org', 3, 'conn-1', null)).toBe('updated');
  });

  it('updates board view without clearing an existing card focus', async () => {
    await addSprintPresence('org', 3, 'conn-1', ada);
    expect(await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'viewing', targetId: 'BT-1' })).toBe(
      'updated'
    );
    expect(await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'viewing', targetId: 'BT-1' }, 'kanban')).toBe(
      'updated'
    );
    expect(await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'viewing', targetId: 'BT-1' }, 'kanban')).toBe(
      'unchanged'
    );
    const snapshot = await addSprintPresence('org', 3, 'probe', bob);
    expect(snapshot.find((viewer) => viewer.userId === 'user-a')).toMatchObject({
      boardView: 'kanban',
      focus: { state: 'viewing', targetId: 'BT-1' },
    });
  });

  it('publishes a gesture-only change without dropping card focus', async () => {
    await addSprintPresence('org', 3, 'conn-1', ada);
    expect(
      await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'dragging', targetId: 'BT-1' })
    ).toBe('updated');
    expect(
      await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'dragging', targetId: 'BT-1' }, undefined, {
        kind: 'drag',
        position: { duration: 3, startDay: 1, startPart: 0 },
      })
    ).toBe('updated');
    expect(
      await updateSprintPresenceFocus('org', 3, 'conn-1', { state: 'dragging', targetId: 'BT-1' }, undefined, {
        kind: 'drag',
        position: { duration: 3, startDay: 1, startPart: 0 },
      })
    ).toBe('unchanged');
    const snapshot = await addSprintPresence('org', 3, 'probe', bob);
    expect(snapshot.find((viewer) => viewer.userId === 'user-a')).toMatchObject({
      focus: { state: 'dragging', targetId: 'BT-1' },
      gesture: { kind: 'drag', position: { duration: 3, startDay: 1, startPart: 0 } },
    });
  });
});
