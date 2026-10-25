import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT } from '@/lib/comments/plannerCommentCardRow';

import { resolveSwimlaneCardLayerSpan } from './layerUtils';

describe('resolveSwimlaneCardLayerSpan', () => {
  it('pairs diagram span with duration, capped like the persisted height', () => {
    const diagram = { id: 'comment:d1', localDraftKind: 'diagram' as const };
    expect(resolveSwimlaneCardLayerSpan(diagram, { duration: 4 })).toBe(4);
    expect(resolveSwimlaneCardLayerSpan(diagram, { duration: 25 })).toBe(10);
    expect(resolveSwimlaneCardLayerSpan({ id: 'local-task-1', localDraftKind: 'diagram' }, { duration: 0 })).toBe(1);
  });

  it('uses the card-row map for notes and widgets, default height for photos', () => {
    const rows = new Map([
      ['comment:n1', { layerShiftUp: 0, span: 3 }],
      ['comment:w1', { layerShiftUp: 0, span: 4 }],
    ]);
    expect(resolveSwimlaneCardLayerSpan({ id: 'comment:n1', localDraftKind: 'comment' }, { duration: 2 }, rows)).toBe(3);
    expect(resolveSwimlaneCardLayerSpan({ id: 'comment:w1', localDraftKind: 'widget' }, { duration: 2 }, rows)).toBe(4);
    expect(resolveSwimlaneCardLayerSpan({ id: 'local-image:x' }, { duration: 2 }, rows)).toBe(
      DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT
    );
  });

  it('keeps tracker tasks on one row', () => {
    expect(resolveSwimlaneCardLayerSpan({ id: 'QUEUE-1' }, { duration: 9 })).toBe(1);
  });
});
