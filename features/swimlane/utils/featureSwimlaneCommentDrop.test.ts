import type { TaskParent } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import {
  applyFeatureLaneCommentDrop,
  FEATURE_LANE_DRAFT_ROW_PREFIX,
} from './featureSwimlaneRows';

function parent(id: string, key = id, display = id): TaskParent {
  return { display, id, key };
}

describe('applyFeatureLaneCommentDrop', () => {
  it('меняет родителя заметки при переносе на черновую строку', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const draftParent = parent(draftId, draftId, 'Draft');
    const onCommentPlanChange = vi.fn();
    applyFeatureLaneCommentDrop({
      comment: {
        assigneeId: 'dev-1',
        day: 0,
        height: 1,
        id: 'c1',
        part: 0,
        text: 'note',
        width: 2,
        x: 0,
        y: 0,
      },
      droppedRowId: draftId,
      incoming: { assignee: draftId, duration: 2, startDay: 1, startPart: 0, taskId: 'comment:c1' },
      rowMetaById: new Map([[draftId, { isDraft: true, parent: draftParent, rowId: draftId }]]),
      onCommentPlanChange,
    });
    expect(onCommentPlanChange).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ day: 1, width: 2 }),
      draftParent
    );
  });
});
