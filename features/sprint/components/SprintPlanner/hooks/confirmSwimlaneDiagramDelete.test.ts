import { describe, expect, it, vi } from 'vitest';

import {
  closeDiagramEditorIfCommentOpen,
  confirmSwimlaneDiagramCommentDelete,
  deleteSwimlaneCommentAfterDiagramConfirm,
} from './confirmSwimlaneDiagramDelete';

function t(key: string): string {
  return key;
}

describe('confirmSwimlaneDiagramCommentDelete', () => {
  it('does not prompt for a regular note', async () => {
    const confirm = vi.fn();
    await expect(
      confirmSwimlaneDiagramCommentDelete({
        isDiagram: false,
        confirm,
        t,
      })
    ).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before deleting a diagram', async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    await expect(
      confirmSwimlaneDiagramCommentDelete({
        isDiagram: true,
        confirm,
        t,
      })
    ).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith('sprintPlanner.contextMenu.deleteDiagramConfirm', {
      cancelText: 'common.cancel',
      confirmText: 'common.delete',
      title: 'sprintPlanner.contextMenu.deleteDiagram',
      variant: 'destructive',
    });
  });
});

describe('deleteSwimlaneCommentAfterDiagramConfirm', () => {
  it('deletes a note immediately', async () => {
    const deleteNow = vi.fn();
    await deleteSwimlaneCommentAfterDiagramConfirm({
      commentId: 'n1',
      comments: [{ id: 'n1', kind: 'text' }],
      confirm: vi.fn(),
      deleteNow,
      t,
    });
    expect(deleteNow).toHaveBeenCalledWith('n1');
  });

  it('does not delete a diagram when the user cancels', async () => {
    const deleteNow = vi.fn();
    const closeDiagramEditor = vi.fn();
    await deleteSwimlaneCommentAfterDiagramConfirm({
      closeDiagramEditor,
      commentId: 'd1',
      comments: [{ id: 'd1', kind: 'diagram' }],
      confirm: vi.fn().mockResolvedValue(false),
      deleteNow,
      diagramEditorTaskId: 'comment:d1',
      t,
    });
    expect(deleteNow).not.toHaveBeenCalled();
    expect(closeDiagramEditor).not.toHaveBeenCalled();
  });

  it('deletes a diagram after confirmation', async () => {
    const deleteNow = vi.fn();
    const closeDiagramEditor = vi.fn();
    await deleteSwimlaneCommentAfterDiagramConfirm({
      closeDiagramEditor,
      commentId: 'd1',
      comments: [{ id: 'd1', kind: 'diagram' }],
      confirm: vi.fn().mockResolvedValue(true),
      deleteNow,
      diagramEditorTaskId: 'comment:d1',
      t,
    });
    expect(closeDiagramEditor).toHaveBeenCalledOnce();
    expect(deleteNow).toHaveBeenCalledWith('d1');
  });
});

describe('closeDiagramEditorIfCommentOpen', () => {
  it('closes the editor for the deleted diagram', () => {
    const close = vi.fn();
    closeDiagramEditorIfCommentOpen('d1', 'comment:d1', close);
    expect(close).toHaveBeenCalledOnce();
    close.mockClear();
    closeDiagramEditorIfCommentOpen('d1', 'comment:other', close);
    expect(close).not.toHaveBeenCalled();
  });
});
