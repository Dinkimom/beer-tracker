import { describe, expect, it, vi } from 'vitest';

import {
  applyHoveredCellImagePaste,
  swimlaneCellIndexToDayPart,
} from './useSwimlaneQuickAddHoverImagePaste';

describe('useSwimlaneQuickAddHoverImagePaste', () => {
  it('converts a timeline cell index to day and part', () => {
    expect(swimlaneCellIndexToDayPart(0)).toEqual({ day: 0, part: 0 });
    expect(swimlaneCellIndexToDayPart(4)).toEqual({ day: 1, part: 1 });
  });

  it('opens an image draft when the clipboard has a file', () => {
    const image = new File([new Uint8Array(8)], 'photo.png', { type: 'image/png' });
    const onCreateTaskInCell = vi.fn();
    const applied = applyHoveredCellImagePaste({
      assigneeId: 'dev-1',
      cellIndex: 4,
      clipboardData: {
        files: [],
        items: [{ getAsFile: () => image, kind: 'file', type: 'image/png' }],
      } as unknown as DataTransfer,
      onCreateTaskInCell,
    });

    expect(applied).toBe(true);
    expect(onCreateTaskInCell).toHaveBeenCalledWith({
      assigneeId: 'dev-1',
      day: 1,
      imageFile: image,
      part: 1,
    });
  });

  it('ignores paste without an image or a copied note', () => {
    const onCreateTaskInCell = vi.fn();
    expect(
      applyHoveredCellImagePaste({
        assigneeId: 'dev-1',
        cellIndex: 0,
        clipboardData: { files: [], items: [] } as unknown as DataTransfer,
        onCreateTaskInCell,
      })
    ).toBe(false);
    expect(onCreateTaskInCell).not.toHaveBeenCalled();
  });

  it('pastes the copied note even if the system clipboard still has an image', () => {
    const image = new File([new Uint8Array(8)], 'photo.png', { type: 'image/png' });
    const onCreateTaskInCell = vi.fn();
    const onPasteNote = vi.fn();
    const applied = applyHoveredCellImagePaste({
      assigneeId: 'dev-1',
      cellIndex: 4,
      clipboardData: {
        files: [],
        items: [{ getAsFile: () => image, kind: 'file', type: 'image/png' }],
      } as unknown as DataTransfer,
      onCreateTaskInCell,
      onPasteNote,
    });

    expect(applied).toBe(true);
    expect(onPasteNote).toHaveBeenCalledWith({
      assigneeId: 'dev-1',
      day: 1,
      part: 1,
    });
    expect(onCreateTaskInCell).not.toHaveBeenCalled();
  });
});
