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
    handleCommentCreate: vi.fn(),
    handleCommentDelete: vi.fn(),
  };
  const notes = {
    approve: vi.fn(),
    changeParent: vi.fn(),
    setCardRowLayout: vi.fn(),
    updateText: vi.fn(),
  };
  const confirm = vi.fn(() => Promise.resolve(confirmed));
  const { result } = renderHook(() =>
    useSwimlaneCommentActions({ comments: comments as Comment[], confirm, handlers, notes })
  );
  return { confirm, handlers, notes, result };
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
    const { handlers, notes, result } = setup([], true);
    expect(result.current.commentActions.onCommentUpdate).toBe(notes.updateText);
    expect(result.current.commentActions.onCommentCreate).toBe(handlers.handleCommentCreate);
  });
});
