import type { Comment } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildCommentCardRowById,
  commentCardRowHeightFromDurationParts,
  commentCardRowHeightFromWidth,
  commentCardRowLayout,
  commentCardRowLayoutToPersistPatch,
  commentCardRowSpan,
  buildSwimlaneCommentProjection,
  commentDurationParts,
  commentSizeFromDraftPosition,
  commentToPersistedTaskPosition,
  commentToSwimlaneTask,
  filterPlannerCommentsByLayers,
  isPlannerAnnotationVisibleOnLayers,
  isSavedSwimlaneCommentTask,
  isSavedSwimlaneDiagramTask,
  isSavedSwimlaneImageCommentTask,
  isSwimlaneCommentTask,
  isSwimlaneCommentTaskId,
  isSwimlaneDiagramTask,
  parseSwimlaneCommentTaskId,
  resolveSwimlaneAnnotationContextMenuVariant,
  selectPendingApprovalCommentIds,
  stripSwimlaneCommentPositions,
  swimlanePositionToCommentPatch,
  swimlanePositionToCommentResizePatch,
  toSwimlaneCommentTaskId,
} from './swimlaneCommentTaskBridge';

function comment(partial: Partial<Comment> & Pick<Comment, 'id'>): Comment {
  return {
    assigneeId: 'dev-1',
    day: 1,
    height: 1,
    part: 0,
    text: 'note',
    width: 3,
    x: 0,
    y: 0,
    ...partial,
  };
}

describe('swimlaneCommentTaskBridge', () => {
  it('round-trips comment id through task id prefix', () => {
    expect(toSwimlaneCommentTaskId('abc')).toBe('comment:abc');
    expect(parseSwimlaneCommentTaskId('comment:abc')).toBe('abc');
    expect(parseSwimlaneCommentTaskId('TASK-1')).toBeNull();
    expect(isSwimlaneCommentTaskId('comment:abc')).toBe(true);
    expect(isSwimlaneCommentTaskId('TASK-1')).toBe(false);
  });

  it('detects swimlane comment tasks including local draft kind', () => {
    expect(isSwimlaneCommentTask({ id: 'comment:c1', localDraftKind: 'comment' })).toBe(true);
    expect(isSwimlaneCommentTask({ id: 'local-draft-1', localDraftKind: 'comment' })).toBe(true);
    expect(isSwimlaneCommentTask({ id: 'comment:c1', localDraftKind: 'image' })).toBe(false);
    expect(isSwimlaneCommentTask({ id: 'comment:c1', localDraftKind: 'diagram' })).toBe(false);
    expect(isSwimlaneCommentTask({ id: 'TASK-1', localDraftKind: 'task' })).toBe(false);
  });

  it('detects saved swimlane notes separately from local drafts', () => {
    expect(isSavedSwimlaneCommentTask({ id: 'comment:c1' })).toBe(true);
    expect(isSavedSwimlaneCommentTask({ id: 'local-task-1' })).toBe(false);
    expect(isSavedSwimlaneCommentTask({ id: 'comment:c1', localDraftKind: 'image' })).toBe(false);
    expect(isSavedSwimlaneCommentTask({ id: 'comment:c1', localDraftKind: 'diagram' })).toBe(false);
    expect(isSavedSwimlaneImageCommentTask({ id: 'comment:c1', localDraftKind: 'image' })).toBe(true);
    expect(isSavedSwimlaneDiagramTask({ id: 'comment:c1', localDraftKind: 'diagram' })).toBe(true);
    expect(isSwimlaneDiagramTask({ id: 'local-task-1', localDraftKind: 'diagram' })).toBe(true);
    expect(resolveSwimlaneAnnotationContextMenuVariant({ id: 'comment:c1' })).toBe('note');
    expect(
      resolveSwimlaneAnnotationContextMenuVariant({ id: 'comment:c1', localDraftKind: 'image' })
    ).toBe('image');
    expect(
      resolveSwimlaneAnnotationContextMenuVariant({ id: 'comment:c1', localDraftKind: 'diagram' })
    ).toBe('diagram');
    expect(resolveSwimlaneAnnotationContextMenuVariant({ id: 'NW-1' })).toBeNull();
  });

  it('treats small width as duration parts and large as legacy px', () => {
    expect(commentDurationParts(comment({ id: '1', width: 3 }))).toBe(3);
    expect(commentDurationParts(comment({ id: '1', width: 200 }))).toBe(2);
  });

  it('maps comment height/y to card row span and layer shift', () => {
    expect(commentCardRowSpan(comment({ id: '1', height: 3 }))).toBe(3);
    expect(commentCardRowSpan(comment({ id: '1', height: 100 }))).toBe(1);
    expect(commentCardRowHeightFromWidth(3)).toBe(3);
    expect(commentCardRowHeightFromWidth(200)).toBe(2);
    expect(commentCardRowHeightFromDurationParts(5)).toBe(5);
    expect(commentCardRowLayout(comment({ id: '1', height: 4, y: 2 }))).toEqual({
      layerShiftUp: 2,
      span: 4,
    });
    expect(commentCardRowLayoutToPersistPatch({ layerShiftUp: 1, span: 3 })).toEqual({
      height: 3,
      y: 1,
    });
    expect(commentSizeFromDraftPosition(5)).toEqual({ height: 1, width: 5, y: 0 });
    expect(commentSizeFromDraftPosition(4, { layerShiftUp: 2, span: 3 })).toEqual({
      height: 3,
      width: 4,
      y: 2,
    });
    const byId = buildCommentCardRowById([
      comment({ id: 'c1', height: 2, y: 1 }),
      comment({ id: 'c2', height: 5, y: 0 }),
    ]);
    expect(byId.get('comment:c1')).toEqual({ layerShiftUp: 1, span: 2 });
    expect(byId.get('comment:c2')).toEqual({ layerShiftUp: 0, span: 5 });
  });

  it('maps a comment onto a persisted task position with the issue id', () => {
    expect(commentToPersistedTaskPosition(comment({ id: 'c1', width: 3 }), 'TASK-9')).toEqual({
      assignee: 'dev-1',
      duration: 3,
      plannedDuration: 3,
      plannedStartDay: 1,
      plannedStartPart: 0,
      startDay: 1,
      startPart: 0,
      taskId: 'TASK-9',
    });
  });

  it('projects comment as sticky comment-kind swimlane task (not a quick-add draft)', () => {
    const task = commentToSwimlaneTask(comment({ id: 'c1', text: 'hello' }));
    expect(task.id).toBe('comment:c1');
    expect(task.name).toBe('hello');
    expect(task.isLocalTask).toBeUndefined();
    expect(task.localDraftKind).toBe('comment');
    expect(task.stickyNoteColor).toBe('yellow');
    expect(task.stickyNoteAuthorName).toBeUndefined();
    expect(task.parent).toBeUndefined();
    expect(task.pendingApproval).toBeUndefined();
  });

  it('marks an MCP pending note so the card can render translucent', () => {
    const task = commentToSwimlaneTask(comment({ id: 'c1', pendingApproval: true, text: 'draft' }));
    expect(task.pendingApproval).toBe(true);
  });

  it('collects ids of notes waiting for agent approval', () => {
    expect(
      selectPendingApprovalCommentIds([
        comment({ id: 'keep', text: 'saved' }),
        comment({ id: 'draft', pendingApproval: true, text: 'pending' }),
      ])
    ).toEqual(['draft']);
  });

  it('projects a stored parent onto the swimlane card', () => {
    const parent = { display: 'Story title', id: 's1', key: 'BT-10' };
    const task = commentToSwimlaneTask(comment({ id: 'c1', parent, text: 'hello' }));
    expect(task.parent).toEqual(parent);
  });

  it('projects an Excalidraw comment as a diagram card without leaking JSON into the title', () => {
    const task = commentToSwimlaneTask(
      comment({
        diagramUrl: '/api/sprints/1/comments/c1/diagram',
        id: 'c1',
        kind: 'diagram',
        text: '',
      })
    );
    expect(task.localDraftKind).toBe('diagram');
    expect(task.name).toBe('');
    expect(task.diagramSceneUrl).toBe('/api/sprints/1/comments/c1/diagram');
    expect(task.excalidrawSceneText).toBeUndefined();
  });

  it('projects the stored Excalidraw scene name onto the diagram card', () => {
    const task = commentToSwimlaneTask(
      comment({
        diagramUrl: '/api/sprints/1/comments/c1/diagram',
        id: 'c1',
        kind: 'diagram',
        text: 'Architecture',
      })
    );
    expect(task.localDraftKind).toBe('diagram');
    expect(task.name).toBe('Architecture');
  });

  it('projects an image comment as a photo card with the stored image url', () => {
    const task = commentToSwimlaneTask(
      comment({
        id: 'c1',
        imageUrl: '/api/sprints/1/comments/c1/image',
        kind: 'image',
        text: 'caption',
      })
    );
    expect(task.localDraftKind).toBe('image');
    expect(task.imageUrl).toBe('/api/sprints/1/comments/c1/image');
    expect(task.name).toBe('caption');
  });

  it('projects the image author onto the photo card', () => {
    const task = commentToSwimlaneTask(
      comment({
        authorName: 'Ada Lovelace',
        id: 'c1',
        imageUrl: '/api/sprints/1/comments/c1/image',
        kind: 'image',
        text: 'caption',
      })
    );
    expect(task.stickyNoteAuthorName).toBe('Ada Lovelace');
  });

  it('projects a saved note color onto the swimlane task', () => {
    const task = commentToSwimlaneTask(comment({ id: 'c1', color: 'pink', text: 'hello' }));
    expect(task.stickyNoteColor).toBe('pink');
  });

  it('projects the note author onto the swimlane task', () => {
    const task = commentToSwimlaneTask(
      comment({ authorName: 'Иван Иванов', id: 'c1', text: 'hello' })
    );
    expect(task.stickyNoteAuthorName).toBe('Иван Иванов');
  });

  it('держит исполнителя на задаче и кладёт строку фичи только в позицию', () => {
    const note = comment({
      assigneeId: 'dev-1',
      id: 'c1',
      rowAssigneeId: '__task_group_no_parent__',
      text: 'hello',
    });
    expect(commentToSwimlaneTask(note).assignee).toBe('dev-1');
    expect(commentToPersistedTaskPosition(note, 'comment:c1').assignee).toBe(
      '__task_group_no_parent__'
    );
  });

  it('builds projection maps and strips comment keys from store writes', () => {
    const { positions, tasksMap } = buildSwimlaneCommentProjection([comment({ id: 'c1' })]);
    expect(tasksMap.has('comment:c1')).toBe(true);
    expect(positions.get('comment:c1')?.duration).toBe(3);

    const mixed = new Map(positions);
    mixed.set('TASK-1', {
      assignee: 'dev-1',
      duration: 1,
      startDay: 0,
      startPart: 0,
      taskId: 'TASK-1',
    });
    const stripped = stripSwimlaneCommentPositions(mixed);
    expect(stripped.has('comment:c1')).toBe(false);
    expect(stripped.has('TASK-1')).toBe(true);
  });

  it('maps task position back to comment patch with duration in width', () => {
    expect(
      swimlanePositionToCommentPatch({
        assignee: 'dev-2',
        duration: 4,
        startDay: 2,
        startPart: 1,
        taskId: 'comment:c1',
      })
    ).toEqual({ assigneeId: 'dev-2', day: 2, part: 1, width: 4 });
    expect(
      swimlanePositionToCommentResizePatch(
        {
          assignee: 'dev-2',
          duration: 4,
          startDay: 2,
          startPart: 1,
          taskId: 'comment:c1',
        },
        comment({ id: 'c1', height: 2 })
      )
    ).toEqual({ assigneeId: 'dev-2', day: 2, height: 2, part: 1, width: 4 });
    expect(
      swimlanePositionToCommentResizePatch(
        {
          assignee: 'dev-2',
          duration: 4,
          startDay: 2,
          startPart: 1,
          taskId: 'comment:c1',
        },
        comment({ id: 'c1', kind: 'image', height: 2 })
      )
    ).toEqual({ assigneeId: 'dev-2', day: 2, height: 2, part: 1, width: 4 });
    expect(
      swimlanePositionToCommentResizePatch(
        {
          assignee: 'dev-2',
          duration: 4,
          startDay: 2,
          startPart: 1,
          taskId: 'comment:c1',
        },
        comment({ id: 'c1', kind: 'diagram', height: 2 })
      )
    ).toEqual({ assigneeId: 'dev-2', day: 2, height: 4, part: 1, width: 4 });
  });

  it('filters planner comments and annotation drafts by swimlane layers', () => {
    const notes = comment({ id: 'n1', text: 'note' });
    const photo = comment({ id: 'p1', kind: 'image', text: 'shot' });
    const layers = { imagesVisible: false, notesVisible: true };
    expect(filterPlannerCommentsByLayers([notes, photo], layers).map((item) => item.id)).toEqual([
      'n1',
    ]);
    expect(filterPlannerCommentsByLayers([notes, photo], { imagesVisible: true, notesVisible: true })).toHaveLength(
      2
    );
    expect(filterPlannerCommentsByLayers([notes, photo], { imagesVisible: false, notesVisible: false })).toEqual(
      []
    );
    expect(isPlannerAnnotationVisibleOnLayers({ id: 'local-1', localDraftKind: 'comment' }, layers)).toBe(
      true
    );
    expect(isPlannerAnnotationVisibleOnLayers({ id: 'local-d', localDraftKind: 'diagram' }, layers)).toBe(
      true
    );
    expect(isPlannerAnnotationVisibleOnLayers({ id: 'local-2', localDraftKind: 'image' }, layers)).toBe(
      false
    );
    expect(isPlannerAnnotationVisibleOnLayers({ id: 'TASK-1', localDraftKind: 'task' }, layers)).toBe(true);
  });
});
