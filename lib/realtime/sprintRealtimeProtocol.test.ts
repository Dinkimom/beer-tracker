import type { SprintRealtimeEvent } from './sprintRealtimeTypes';

import { describe, expect, it } from 'vitest';

import { parseSprintRealtimeMessage, shouldApplySprintRealtimeEvent, sprintRealtimeChannel } from './sprintRealtimeProtocol';

const event: SprintRealtimeEvent = {
  at: 1,
  organizationId: '11111111-1111-4111-8111-111111111111',
  originClientId: 'tab-a',
  resources: ['positions'],
  sprintId: 7,
  type: 'sprint.changed',
};

const presence = {
  at: 2,
  organizationId: event.organizationId,
  sprintId: 7,
  type: 'sprint.presence' as const,
  viewers: [{ avatarUrl: 'https://cdn.example/a.png', displayName: 'Ada', userId: 'u-1' }],
};

describe('sprintRealtimeProtocol', () => {
  it('builds a stable Redis channel', () => {
    expect(sprintRealtimeChannel('org-1', 42)).toBe('beer-tracker:sprint-realtime:org-1:42');
  });

  it('parses a valid JSON event', () => {
    expect(parseSprintRealtimeMessage(JSON.stringify(event))).toEqual(event);
  });

  it('parses a presence snapshot including an empty viewer list', () => {
    expect(parseSprintRealtimeMessage(JSON.stringify(presence))).toEqual(presence);
    expect(
      parseSprintRealtimeMessage({
        ...presence,
        viewers: [],
      })
    ).toEqual({ ...presence, viewers: [] });
  });

  it('parses a reactions resource', () => {
    expect(
      parseSprintRealtimeMessage({
        ...event,
        resources: ['reactions'],
      })
    ).toEqual({ ...event, resources: ['reactions'] });
  });

  it('parses a tasks resource with issue status payload', () => {
    expect(
      parseSprintRealtimeMessage({
        ...event,
        resources: ['tasks'],
        issueStatus: { issueKey: 'BT-1', statusKey: 'inProgress' },
      })
    ).toEqual({
      ...event,
      resources: ['tasks'],
      issueStatus: { issueKey: 'BT-1', statusKey: 'inProgress' },
    });
  });

  it('parses a tasks resource with issue membership payload', () => {
    expect(
      parseSprintRealtimeMessage({
        ...event,
        resources: ['tasks'],
        issueMembership: { action: 'added', issueKey: 'BT-1' },
      })
    ).toEqual({
      ...event,
      resources: ['tasks'],
      issueMembership: { action: 'added', issueKey: 'BT-1' },
    });
  });

  it('keeps the added-task snapshot when it matches the issue key', () => {
    const task = { id: 'BT-1', name: 'Card', team: 'Back', link: 'https://tracker.example/BT-1' };
    expect(
      parseSprintRealtimeMessage({
        ...event,
        resources: ['tasks'],
        issueMembership: { action: 'added', issueKey: 'BT-1', task },
      })
    ).toEqual({
      ...event,
      resources: ['tasks'],
      issueMembership: { action: 'added', issueKey: 'BT-1', task },
    });
  });

  it('drops a membership task snapshot that does not match the issue key', () => {
    expect(
      parseSprintRealtimeMessage({
        ...event,
        resources: ['tasks'],
        issueMembership: {
          action: 'added',
          issueKey: 'BT-1',
          task: { id: 'BT-2', name: 'Other', team: 'Back', link: '' },
        },
      })
    ).toEqual({
      ...event,
      resources: ['tasks'],
      issueMembership: { action: 'added', issueKey: 'BT-1' },
    });
  });

  it('parses a card-row resize gesture on a presence viewer', () => {
    expect(
      parseSprintRealtimeMessage({
        ...presence,
        viewers: [
          {
            ...presence.viewers[0],
            clientId: 'tab-1',
            focus: { state: 'resizing', targetId: 'comment:9' },
            gesture: { cardRow: { layerShiftUp: 1, span: 3 }, kind: 'resize' },
          },
        ],
      })
    ).toEqual({
      ...presence,
      viewers: [
        {
          ...presence.viewers[0],
          clientId: 'tab-1',
          focus: { state: 'resizing', targetId: 'comment:9' },
          gesture: { cardRow: { layerShiftUp: 1, span: 3 }, kind: 'resize' },
        },
      ],
    });
  });

  it('parses optional card focus on a presence viewer', () => {
    expect(
      parseSprintRealtimeMessage({
        ...presence,
        viewers: [
          {
            ...presence.viewers[0],
            boardView: 'occupancy',
            clientId: 'tab-1',
            focus: { state: 'resizing', targetId: 'BT-1' },
          },
        ],
      })
    ).toEqual({
      ...presence,
      viewers: [
        {
          ...presence.viewers[0],
          boardView: 'occupancy',
          clientId: 'tab-1',
          focus: { state: 'resizing', targetId: 'BT-1' },
        },
      ],
    });
  });

  it('parses a shared timer snapshot', () => {
    const timerEvent = {
      at: 3,
      organizationId: event.organizationId,
      originClientId: 'tab-a',
      sprintId: 7,
      timer: {
        durationMs: 60_000,
        endsAt: 1_060_000,
        remainingMs: 60_000,
        serverNow: 1_000_000,
        status: 'running' as const,
        updatedAt: 1_000_000,
        updatedBy: { displayName: 'Ada', userId: 'u-1' },
      },
      type: 'sprint.timer' as const,
    };
    expect(parseSprintRealtimeMessage(JSON.stringify(timerEvent))).toEqual(timerEvent);
    expect(parseSprintRealtimeMessage({ ...timerEvent, timer: { ...timerEvent.timer, status: 'nope' } })).toBeNull();
  });

  it('rejects unknown resources and non-events', () => {
    expect(parseSprintRealtimeMessage('{"type":"ping"}')).toBeNull();
    expect(parseSprintRealtimeMessage({ ...event, resources: ['widgets'] })).toBeNull();
    expect(parseSprintRealtimeMessage({ ...event, sprintId: 0 })).toBeNull();
    expect(parseSprintRealtimeMessage({ ...presence, viewers: [{ displayName: 'Ada' }] })).toBeNull();
  });

  it('ignores the originating browser tab and applies foreign updates', () => {
    expect(
      shouldApplySprintRealtimeEvent(event, {
        clientId: 'tab-a',
        organizationId: event.organizationId,
        sprintId: 7,
      })
    ).toBe(false);
    expect(
      shouldApplySprintRealtimeEvent(event, {
        clientId: 'tab-b',
        organizationId: event.organizationId,
        sprintId: 7,
      })
    ).toBe(true);
  });
});
