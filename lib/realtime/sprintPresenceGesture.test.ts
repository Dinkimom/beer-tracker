import type { SprintPresenceViewer } from './sprintRealtimeTypes';

import { describe, expect, it } from 'vitest';

import {
  buildLocalSprintPresenceGesture,
  parseSprintPresenceGesture,
  remotePresenceCardRowPreviews,
  remotePresenceNotePreview,
  remotePresenceOccupancyPreviews,
  remotePresenceResizePreview,
  sprintPresenceGestureEquals,
  sprintPresenceGesturePublishDelayMs,
} from './sprintPresenceGesture';
import {
  presenceCardRowMapsEqual,
  presenceOccupancyPreviewMapsEqual,
  presencePositionPreviewEquals,
  retainPresenceOccupancyPreviews,
  retainPresencePositionPreview,
  retainRemotePresenceCardRows,
} from './sprintPresenceGestureRetain';

const viewer = (
  overrides: Partial<SprintPresenceViewer> & Pick<SprintPresenceViewer, 'userId'>
): SprintPresenceViewer => ({
  avatarUrl: null,
  displayName: overrides.displayName ?? overrides.userId,
  ...overrides,
});

describe('parseSprintPresenceGesture', () => {
  it('rejects empty or incomplete payloads', () => {
    expect(parseSprintPresenceGesture(null)).toBeUndefined();
    expect(parseSprintPresenceGesture({ kind: 'drag' })).toBeUndefined();
    expect(parseSprintPresenceGesture({ kind: 'nope', note: { text: 'hi' } })).toBeUndefined();
  });

  it('keeps a card-row height resize', () => {
    expect(
      parseSprintPresenceGesture({
        kind: 'resize',
        cardRow: { layerShiftUp: 1, span: 3 },
      })
    ).toEqual({
      kind: 'resize',
      cardRow: { layerShiftUp: 1, span: 3 },
    });
    expect(
      parseSprintPresenceGesture({
        kind: 'resize',
        cardRow: { layerShiftUp: 3, span: 2 },
      })
    ).toBeUndefined();
  });

  it('keeps note text and a valid position', () => {
    expect(
      parseSprintPresenceGesture({
        kind: 'edit',
        note: { color: 'yellow', text: 'hello' },
        position: { duration: 3, startDay: 1, startPart: 2 },
      })
    ).toEqual({
      kind: 'edit',
      note: { color: 'yellow', text: 'hello' },
      position: { duration: 3, startDay: 1, startPart: 2 },
    });
  });
});

describe('buildLocalSprintPresenceGesture', () => {
  it('packs the sticky-note draft while editing', () => {
    expect(
      buildLocalSprintPresenceGesture({
        draggingTaskId: null,
        focus: { state: 'editing', targetId: 'note-1' },
        noteAssignee: 'dev-a',
        noteColor: 'pink',
        noteDay: 2,
        noteDuration: 2,
        notePart: 1,
        noteTaskId: 'note-1',
        noteText: 'typed',
      })
    ).toEqual({
      kind: 'edit',
      note: { color: 'pink', text: 'typed' },
      position: { assignee: 'dev-a', duration: 2, startDay: 2, startPart: 1 },
    });
  });

  it('packs a vertical card-row resize without a duration', () => {
    expect(
      buildLocalSprintPresenceGesture({
        cardRowLayerShiftUp: 1,
        cardRowSpan: 3,
        cardRowTaskId: 'note-1',
        draggingTaskId: null,
        focus: { state: 'resizing', targetId: 'note-1' },
        noteDay: 2,
        noteDuration: 2,
        notePart: 1,
      })
    ).toEqual({
      cardRow: { layerShiftUp: 1, span: 3 },
      kind: 'resize',
      position: { duration: 2, startDay: 2, startPart: 1 },
    });
  });

  it('does not invent a start cell when resize only has duration', () => {
    expect(
      buildLocalSprintPresenceGesture({
        draggingTaskId: null,
        focus: { state: 'resizing', targetId: 'note-1' },
        resizeDuration: 4,
        resizeTaskId: 'note-1',
      })
    ).toBeNull();
    expect(
      buildLocalSprintPresenceGesture({
        draggingTaskId: null,
        focus: { state: 'resizing', targetId: 'note-1' },
        noteDay: 2,
        notePart: 1,
        resizeDuration: 4,
        resizeTaskId: 'note-1',
      })
    ).toEqual({
      kind: 'resize',
      position: { duration: 4, startDay: 2, startPart: 1 },
    });
  });

  it('packs occupancy drag before swimlane hover', () => {
    expect(
      buildLocalSprintPresenceGesture({
        dragDay: 4,
        dragDuration: 3,
        dragPart: 0,
        draggingTaskId: 'BT-1',
        focus: { state: 'dragging', targetId: 'BT-1' },
        occupancyDuration: 6,
        occupancyStartDay: 2,
        occupancyStartPart: 1,
        occupancyTaskId: 'BT-1',
      })
    ).toEqual({
      kind: 'drag',
      position: { duration: 6, startDay: 2, startPart: 1 },
    });
  });

  it('packs a swimlane hover cell as a drag position', () => {
    expect(
      buildLocalSprintPresenceGesture({
        dragAssigneeId: 'dev-b',
        dragDay: 3,
        dragDuration: 3,
        dragPart: 1,
        draggingTaskId: 'comment:1',
        focus: { state: 'dragging', targetId: 'comment:1' },
        noteColor: 'yellow',
        noteText: 'hello',
      })
    ).toEqual({
      kind: 'drag',
      note: { color: 'yellow', text: 'hello' },
      position: { assignee: 'dev-b', duration: 3, startDay: 3, startPart: 1 },
    });
  });
});

describe('remote presence previews', () => {
  const remote = viewer({
    clientId: 'tab-b',
    focus: { state: 'dragging', targetId: 'BT-1' },
    gesture: {
      kind: 'drag',
      note: { text: 'draft' },
      position: { assignee: 'dev-b', duration: 3, startDay: 1, startPart: 0 },
    },
    userId: 'user-b',
  });

  it('ignores the local tab and maps note / occupancy / swimlane previews', () => {
    const own = viewer({
      clientId: 'tab-a',
      focus: { state: 'editing', targetId: 'BT-1' },
      gesture: { kind: 'edit', note: { text: 'mine' } },
      userId: 'user-a',
    });
    expect(remotePresenceNotePreview([own, remote], 'BT-1', 'tab-a')).toEqual({
      taskId: 'BT-1',
      text: 'draft',
    });
    expect(remotePresenceResizePreview([own, remote], 'tab-a')).toEqual({
      assignee: 'dev-b',
      duration: 3,
      note: { text: 'draft' },
      startCell: 3,
      taskId: 'BT-1',
    });
    expect(remotePresenceOccupancyPreviews([own, remote], 'tab-a').get('BT-1')).toEqual({
      duration: 3,
      startDay: 1,
      startPart: 0,
    });
    expect(
      remotePresenceCardRowPreviews(
        [
          own,
          viewer({
            clientId: 'tab-c',
            focus: { state: 'resizing', targetId: 'note-1' },
            gesture: { cardRow: { layerShiftUp: 1, span: 4 }, kind: 'resize' },
            userId: 'user-c',
          }),
        ],
        'tab-a'
      ).get('note-1')
    ).toEqual({ layerShiftUp: 1, span: 4 });
  });

  it('keeps the last remote height until comments catch up', () => {
    const live = new Map([['note-1', { layerShiftUp: 1, span: 4 }]]);
    const latched = retainRemotePresenceCardRows(live, new Map(), new Map());
    expect(latched.get('note-1')).toEqual({ layerShiftUp: 1, span: 4 });
    expect(
      retainRemotePresenceCardRows(new Map(), latched, new Map([['note-1', { layerShiftUp: 0, span: 1 }]])).get(
        'note-1'
      )
    ).toEqual({ layerShiftUp: 1, span: 4 });
    expect(
      retainRemotePresenceCardRows(new Map(), latched, new Map([['note-1', { layerShiftUp: 1, span: 4 }]])).has(
        'note-1'
      )
    ).toBe(false);
    expect(presenceCardRowMapsEqual(latched, new Map([['note-1', { layerShiftUp: 1, span: 4 }]]))).toBe(true);
  });

  it('keeps the last width until saved positions catch up', () => {
    const live = { duration: 5, startCell: 3, taskId: 'BT-1' };
    expect(retainPresencePositionPreview(live, null, undefined)).toEqual(live);
    expect(
      retainPresencePositionPreview(null, live, {
        duration: 2,
        startDay: 0,
        startPart: 0,
      })
    ).toEqual(live);
    expect(
      retainPresencePositionPreview(null, live, {
        duration: 5,
        startDay: 1,
        startPart: 0,
      })
    ).toBeNull();
    expect(presencePositionPreviewEquals(live, { duration: 5, startCell: 3, taskId: 'BT-1' })).toBe(
      true
    );
    const occupancyLive = new Map([['BT-1', { duration: 5, startDay: 1, startPart: 0 }]]);
    const occupancyLatched = retainPresenceOccupancyPreviews(occupancyLive, new Map(), new Map());
    expect(
      retainPresenceOccupancyPreviews(
        new Map(),
        occupancyLatched,
        new Map([['BT-1', { duration: 2, startDay: 0, startPart: 0, assignee: 'a', taskId: 'BT-1' }]])
      ).get('BT-1')
    ).toEqual({ duration: 5, startDay: 1, startPart: 0 });
    expect(
      presenceOccupancyPreviewMapsEqual(
        occupancyLatched,
        new Map([['BT-1', { duration: 5, startDay: 1, startPart: 0 }]])
      )
    ).toBe(true);
  });
});

describe('sprintPresenceGestureEquals', () => {
  it('treats missing and null as the same empty gesture', () => {
    expect(sprintPresenceGestureEquals(undefined, null)).toBe(true);
    expect(
      sprintPresenceGestureEquals(
        { kind: 'drag', position: { duration: 1, startDay: 0, startPart: 0 } },
        { kind: 'drag', position: { duration: 1, startDay: 0, startPart: 0 } }
      )
    ).toBe(true);
  });
});

describe('sprintPresenceGesturePublishDelayMs', () => {
  it('is faster for a moving bar than for hover', () => {
    expect(
      sprintPresenceGesturePublishDelayMs('dragging:BT-1', {
        kind: 'drag',
        position: { duration: 3, startDay: 0, startPart: 0 },
      })
    ).toBe(50);
    expect(
      sprintPresenceGesturePublishDelayMs('editing:BT-1', { kind: 'edit', note: { text: 'x' } })
    ).toBe(150);
    expect(
      sprintPresenceGesturePublishDelayMs('resizing:note-1', {
        cardRow: { layerShiftUp: 0, span: 2 },
        kind: 'resize',
      })
    ).toBe(50);
    expect(sprintPresenceGesturePublishDelayMs('viewing:BT-1', null)).toBe(300);
  });
});
