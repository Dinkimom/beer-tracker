import { describe, expect, it } from 'vitest';

import {
  computeSwimlaneLinkAlreadyExists,
  computeSwimlaneLinkSourceEndCell,
  computeSwimlaneValidLinkTargetByTime,
  excludeTaskLinksTouchingId,
  filterTaskLinksByKnownTaskIds,
  isSwimlaneCardContextLinking,
  isSwimlaneLinkingSessionActive,
  resolveSwimlaneLinkingCardClick,
  resolveSwimlaneLinkingOutlineRadiusClass,
  resolveSwimlaneLinkPreviewTargetId,
  resolveSwimlanePlacementLinkMode,
  resolveSwimlaneTaskLinkMode,
  selectTaskLinksTouchingId,
  shouldShowSwimlaneLinkDeleteHandles,
} from './swimlaneLinkingHelpers';

describe('swimlaneLinkingHelpers', () => {
  const positions = new Map([
    [
      'from',
      {
        assignee: 'dev',
        duration: 3,
        startDay: 0,
        startPart: 0,
        taskId: 'from',
      },
    ],
    [
      'valid-to',
      {
        assignee: 'dev',
        duration: 2,
        startDay: 1,
        startPart: 0,
        taskId: 'valid-to',
      },
    ],
    [
      'early-to',
      {
        assignee: 'dev',
        duration: 2,
        startDay: 0,
        startPart: 0,
        taskId: 'early-to',
      },
    ],
  ]);

  it('computeSwimlaneLinkSourceEndCell returns end cell of source position', () => {
    expect(computeSwimlaneLinkSourceEndCell('from', positions)).toBe(3);
    expect(computeSwimlaneLinkSourceEndCell(null, positions)).toBeNull();
    expect(computeSwimlaneLinkSourceEndCell('missing', positions)).toBeNull();
  });

  it('computeSwimlaneValidLinkTargetByTime requires target start after source end', () => {
    expect(
      computeSwimlaneValidLinkTargetByTime(positions.get('valid-to'), 3)
    ).toBe(true);
    expect(
      computeSwimlaneValidLinkTargetByTime(positions.get('early-to'), 3)
    ).toBe(false);
    expect(computeSwimlaneValidLinkTargetByTime(undefined, 3)).toBe(false);
  });

  it('isSwimlaneLinkingSessionActive is on while the tool is armed or a source is picked', () => {
    expect(isSwimlaneLinkingSessionActive(null, false)).toBe(false);
    expect(isSwimlaneLinkingSessionActive(null, true)).toBe(true);
    expect(isSwimlaneLinkingSessionActive('from', false)).toBe(true);
  });

  it('isSwimlaneCardContextLinking is only the one-shot session from a card menu', () => {
    expect(isSwimlaneCardContextLinking(null, false)).toBe(false);
    expect(isSwimlaneCardContextLinking(null, true)).toBe(false);
    expect(isSwimlaneCardContextLinking('from', true)).toBe(false);
    expect(isSwimlaneCardContextLinking('from', false)).toBe(true);
  });

  it('shouldShowSwimlaneLinkDeleteHandles while the toolbar capsule is armed', () => {
    expect(shouldShowSwimlaneLinkDeleteHandles(false)).toBe(false);
    expect(shouldShowSwimlaneLinkDeleteHandles(true)).toBe(true);
  });

  it('computeSwimlaneLinkAlreadyExists detects existing directed link', () => {
    const links = [{ fromTaskId: 'from', toTaskId: 'valid-to' }];
    expect(computeSwimlaneLinkAlreadyExists('from', 'valid-to', links)).toBe(true);
    expect(computeSwimlaneLinkAlreadyExists('from', 'early-to', links)).toBe(false);
  });

  it('resolveSwimlaneTaskLinkMode returns source / target / null', () => {
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: false,
        linkingFromTaskId: 'from',
        taskId: 'from',
        validTargetByTime: true,
      })
    ).toBe('source');
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: false,
        linkingFromTaskId: 'from',
        taskId: 'valid-to',
        validTargetByTime: true,
      })
    ).toBe('target');
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: true,
        linkingFromTaskId: 'from',
        taskId: 'valid-to',
        validTargetByTime: true,
      })
    ).toBeNull();
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: false,
        linkingFromTaskId: null,
        taskId: 'valid-to',
        validTargetByTime: true,
      })
    ).toBeNull();
  });

  it('resolveSwimlaneTaskLinkMode allows saved comments, photos and diagrams', () => {
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: false,
        linkingFromTaskId: 'from',
        taskId: 'comment:abc',
        validTargetByTime: false,
      })
    ).toBe('target');
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: false,
        linkingFromTaskId: 'comment:abc',
        taskId: 'valid-to',
        validTargetByTime: false,
      })
    ).toBe('target');
  });

  it('resolveSwimlanePlacementLinkMode outlines connectable cards while the link tool is armed', () => {
    expect(
      resolveSwimlanePlacementLinkMode({
        linkAlreadyExists: false,
        linkToolArmed: true,
        linkingFromTaskId: null,
        segmentEditorActive: false,
        taskId: 'NW-1',
        validTargetByTime: false,
      })
    ).toBe('target');
    expect(
      resolveSwimlanePlacementLinkMode({
        linkAlreadyExists: false,
        linkToolArmed: true,
        linkingFromTaskId: null,
        segmentEditorActive: false,
        taskId: 'local-task-1',
        validTargetByTime: false,
      })
    ).toBeNull();
    expect(
      resolveSwimlanePlacementLinkMode({
        linkAlreadyExists: false,
        linkToolArmed: false,
        linkingFromTaskId: null,
        segmentEditorActive: false,
        taskId: 'NW-1',
        validTargetByTime: false,
      })
    ).toBeNull();
    expect(
      resolveSwimlanePlacementLinkMode({
        linkAlreadyExists: false,
        linkToolArmed: true,
        linkingFromTaskId: 'from',
        segmentEditorActive: false,
        taskId: 'from',
        validTargetByTime: true,
      })
    ).toBe('source');
    expect(
      resolveSwimlanePlacementLinkMode({
        linkAlreadyExists: false,
        linkToolArmed: true,
        linkingFromTaskId: null,
        segmentEditorActive: true,
        taskId: 'NW-1',
        validTargetByTime: false,
      })
    ).toBeNull();
  });

  it('resolveSwimlaneTaskLinkMode ignores unsaved quick-add drafts', () => {
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: false,
        linkingFromTaskId: 'from',
        taskId: 'local-task-abc',
        validTargetByTime: true,
      })
    ).toBeNull();
    expect(
      resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: false,
        linkingFromTaskId: 'from',
        taskId: 'local-image:abc',
        validTargetByTime: true,
      })
    ).toBeNull();
  });

  it('filterTaskLinksByKnownTaskIds keeps comment endpoints that are known', () => {
    const known = new Set(['NW-1', 'comment:abc']);
    expect(
      filterTaskLinksByKnownTaskIds(
        [
          { fromTaskId: 'NW-1', toTaskId: 'comment:abc' },
          { fromTaskId: 'NW-1', toTaskId: 'missing' },
        ],
        known
      )
    ).toEqual([{ fromTaskId: 'NW-1', toTaskId: 'comment:abc' }]);
  });

  it('selects and excludes links touching a task id', () => {
    const links = [
      { fromTaskId: 'a', id: '1', toTaskId: 'comment:x' },
      { fromTaskId: 'b', id: '2', toTaskId: 'c' },
    ];
    expect(selectTaskLinksTouchingId(links, 'comment:x')).toEqual([links[0]]);
    expect(excludeTaskLinksTouchingId(links, 'comment:x')).toEqual([links[1]]);
  });

  it('resolveSwimlaneLinkPreviewTargetId snaps only to a valid target under the cursor', () => {
    const links = [{ fromTaskId: 'from', toTaskId: 'other' }];
    expect(
      resolveSwimlaneLinkPreviewTargetId({
        hoveredTaskId: 'valid-to',
        linkingFromTaskId: 'from',
        taskLinks: links,
        taskPositions: positions,
      })
    ).toBe('valid-to');
    expect(
      resolveSwimlaneLinkPreviewTargetId({
        hoveredTaskId: 'early-to',
        linkingFromTaskId: 'from',
        taskLinks: links,
        taskPositions: positions,
      })
    ).toBeNull();
    expect(
      resolveSwimlaneLinkPreviewTargetId({
        hoveredTaskId: 'from',
        linkingFromTaskId: 'from',
        taskLinks: links,
        taskPositions: positions,
      })
    ).toBeNull();
    expect(
      resolveSwimlaneLinkPreviewTargetId({
        hoveredTaskId: 'comment:abc',
        linkingFromTaskId: 'from',
        taskLinks: links,
        taskPositions: positions,
      })
    ).toBe('comment:abc');
    expect(
      resolveSwimlaneLinkPreviewTargetId({
        hoveredTaskId: 'valid-to',
        linkingFromTaskId: null,
        taskLinks: links,
        taskPositions: positions,
      })
    ).toBeNull();
  });
});

describe('resolveSwimlaneLinkingOutlineRadiusClass', () => {
  it('uses square corners for sticky notes, photos and diagrams', () => {
    expect(
      resolveSwimlaneLinkingOutlineRadiusClass({ id: 'comment:abc', localDraftKind: 'comment' })
    ).toBe('rounded-none');
    expect(
      resolveSwimlaneLinkingOutlineRadiusClass({ id: 'local-task-1', localDraftKind: 'comment' })
    ).toBe('rounded-none');
    expect(
      resolveSwimlaneLinkingOutlineRadiusClass({ id: 'local-image:abc', localDraftKind: 'image' })
    ).toBe('rounded-none');
    expect(
      resolveSwimlaneLinkingOutlineRadiusClass({ id: 'comment:abc', localDraftKind: 'image' })
    ).toBe('rounded-none');
    expect(
      resolveSwimlaneLinkingOutlineRadiusClass({ id: 'local-task-1', localDraftKind: 'diagram' })
    ).toBe('rounded-none');
    expect(
      resolveSwimlaneLinkingOutlineRadiusClass({ id: 'comment:abc', localDraftKind: 'diagram' })
    ).toBe('rounded-none');
  });

  it('keeps rounded corners for regular tasks', () => {
    expect(
      resolveSwimlaneLinkingOutlineRadiusClass({ id: 'TASK-1', localDraftKind: 'task' })
    ).toBe('rounded-lg');
  });
});

describe('resolveSwimlaneLinkingCardClick', () => {
  const idle = {
    canCompleteLink: false,
    canUseAsSource: true,
    linkingFromTaskId: null as string | null,
    taskId: 'card-a',
  };

  it('opens the card when the link tool is not armed', () => {
    expect(resolveSwimlaneLinkingCardClick({ ...idle, linkToolArmed: false })).toBe('open');
  });

  it('starts a rubber-band from the clicked card in link mode', () => {
    expect(resolveSwimlaneLinkingCardClick({ ...idle, linkToolArmed: true })).toBe('start-source');
  });

  it('cancels the source when the same card is clicked again', () => {
    expect(
      resolveSwimlaneLinkingCardClick({
        canCompleteLink: false,
        canUseAsSource: true,
        linkToolArmed: true,
        linkingFromTaskId: 'card-a',
        taskId: 'card-a',
      })
    ).toBe('cancel-source');
  });

  it('completes a valid target and retargets an invalid saved card', () => {
    expect(
      resolveSwimlaneLinkingCardClick({
        canCompleteLink: true,
        canUseAsSource: true,
        linkToolArmed: true,
        linkingFromTaskId: 'card-a',
        taskId: 'card-b',
      })
    ).toBe('complete');
    expect(
      resolveSwimlaneLinkingCardClick({
        canCompleteLink: false,
        canUseAsSource: true,
        linkToolArmed: true,
        linkingFromTaskId: 'card-a',
        taskId: 'card-b',
      })
    ).toBe('start-source');
  });

  it('completes a one-shot link started from a card without arming the tool', () => {
    expect(
      resolveSwimlaneLinkingCardClick({
        canCompleteLink: true,
        canUseAsSource: true,
        linkToolArmed: false,
        linkingFromTaskId: 'card-a',
        taskId: 'card-b',
      })
    ).toBe('complete');
  });
});
