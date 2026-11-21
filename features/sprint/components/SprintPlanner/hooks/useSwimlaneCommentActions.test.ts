/** @vitest-environment jsdom */

import type { Comment } from '@/types';

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSwimlaneCommentActions } from './useSwimlaneCommentActions';

const closeDiagramEditor = vi.fn();
vi.mock('@/lib/layers', () => ({
  useRootStore: () => ({ sprintPlannerUi: { tools: { closeDiagramEditor, diagramEditorTaskId: null } } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

function setup(comments: Array<Pick<Comment, 'id' | 'kind'>>, confirmed: boolean) {
  const handlers = {
    handleCommentApprove: vi.fn(),
    handleCommentCardRowLayoutUpdate: vi.fn(),
    handleCommentCreate: vi.fn(),
    handleCommentDelete: vi.fn(),
    handleCommentParentChange: vi.fn(),
    handleCommentUpdate: vi.fn(),
  };
  const confirm = vi.fn(() => Promise.resolve(confirmed));
  const { result } = renderHook(() =>
    useSwimlaneCommentActions({ comments: comments as Comment[], confirm, handlers })
  );
  return { confirm, handlers, result };
}

describe('useSwimlaneCommentActions', () => {
  it('asks before deleting a diagram from the lane and keeps it when declined', async () => {
    const { confirm, handlers, result } = setup([{ id: 'd1', kind: 'diagram' }], false);
    await result.current.commentActions.onCommentDelete?.('d1');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(handlers.handleCommentDelete).not.toHaveBeenCalled();
  });

  it('deletes a plain note at once, the same way the board windows do', async () => {
    const { confirm, handlers, result } = setup([{ id: 'n1', kind: 'text' }], true);
    expect(result.current.commentActions.onCommentDelete).toBe(result.current.handleCommentDelete);
    await result.current.commentActions.onCommentDelete?.('n1');
    expect(confirm).not.toHaveBeenCalled();
    expect(handlers.handleCommentDelete).toHaveBeenCalledWith('n1');
  });

  it('passes the other note actions through unchanged', () => {
    const { handlers, result } = setup([], true);
    expect(result.current.commentActions.onCommentUpdate).toBe(handlers.handleCommentUpdate);
    expect(result.current.commentActions.onCommentCreate).toBe(handlers.handleCommentCreate);
  });
});
