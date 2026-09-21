import { describe, expect, it, vi } from 'vitest';

import { resolveTaskBarDraftSaveAction } from './taskBarDraftSave';

describe('resolveTaskBarDraftSaveAction', () => {
  it('saves a photo draft only after a file is attached', () => {
    const onSubmit = vi.fn();
    const empty = resolveTaskBarDraftSaveAction({
      imageDraft: { isSubmitting: false, onSubmit },
    });
    expect(empty).toEqual({ disabled: true, onSave: onSubmit });

    const ready = resolveTaskBarDraftSaveAction({
      imageDraft: { imageUrl: 'blob:photo', isSubmitting: false, onSubmit },
    });
    ready?.onSave();
    expect(ready?.disabled).toBe(false);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('saves a note draft only when there is text', () => {
    const onSubmit = vi.fn();
    const empty = resolveTaskBarDraftSaveAction({
      noteEditor: { value: '   ', onSubmit },
    });
    expect(empty?.disabled).toBe(true);
    expect(empty?.showDisabledSave).toBe(true);

    const ready = resolveTaskBarDraftSaveAction({
      noteEditor: { value: 'Hello', onSubmit },
    });
    ready?.onSave();
    expect(ready?.disabled).toBe(false);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('cancels a note draft even when save is disabled', () => {
    const onCancel = vi.fn();
    const action = resolveTaskBarDraftSaveAction({
      noteEditor: { onCancel, onSubmit: vi.fn(), showDisabledSave: true, value: '' },
    });
    expect(action?.disabled).toBe(true);
    expect(action?.showDisabledSave).toBe(true);
    action?.onCancel?.();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('keeps a disabled save control visible for an empty note', () => {
    const action = resolveTaskBarDraftSaveAction({
      noteEditor: { value: '', onSubmit: vi.fn() },
    });
    expect(action).toMatchObject({ disabled: true, showDisabledSave: true });
  });

  it('does not show a save control without an inline draft', () => {
    expect(resolveTaskBarDraftSaveAction({})).toBeNull();
  });

  it('saves a diagram draft even without a caption', () => {
    const onSubmit = vi.fn();
    const action = resolveTaskBarDraftSaveAction({
      diagramDraft: { isSubmitting: false, onSubmit },
    });
    expect(action?.disabled).toBe(false);
    action?.onSave();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('prefers a photo draft when both save targets exist', () => {
    const saveImage = vi.fn();
    const saveNote = vi.fn();
    const action = resolveTaskBarDraftSaveAction({
      imageDraft: { imageUrl: 'blob:photo', isSubmitting: false, onSubmit: saveImage },
      noteEditor: { value: 'Hello', onSubmit: saveNote },
    });
    action?.onSave();
    expect(saveImage).toHaveBeenCalledOnce();
    expect(saveNote).not.toHaveBeenCalled();
  });
});
