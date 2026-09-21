import type { Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import {
  buildInlineDiagramDraftEditor,
  buildInlineImageDraftEditor,
  buildInlineNoteDraftEditor,
  isInlineDiagramCreateDraft,
  isInlineImageCreateDraft,
  isInlineNoteCreateDraft,
  isInlineNoteEdit,
  resolvePlanSegmentInlineNoteEditor,
  resolveTaskWithNoteEditPreview,
  usesIndependentSwimlaneCardRowBand,
} from './taskLayerPlanSegmentItemHelpers';

function draftTask(overrides?: Partial<Task>): Task {
  return {
    id: 'local-task-1',
    isLocalTask: true,
    localDraftKind: 'task',
    link: '#',
    name: '',
    status: 'todo',
    team: 'Back',
    trackerQueue: 'QUEUE',
    type: 'task',
    ...overrides,
  };
}

describe('resolveTaskWithNoteEditPreview', () => {
  it('overlays the live note edit preview onto the card task', () => {
    const task = draftTask({
      localDraftKind: 'comment',
      name: 'Original',
      stickyNoteColor: 'yellow',
    });
    expect(resolveTaskWithNoteEditPreview(task, null)).toBe(task);
    expect(resolveTaskWithNoteEditPreview(task, { color: 'pink', taskId: 'other' })).toBe(task);
    expect(
      resolveTaskWithNoteEditPreview(task, { color: 'pink', taskId: 'local-task-1' }).stickyNoteColor
    ).toBe('pink');
    expect(
      resolveTaskWithNoteEditPreview(task, { taskId: 'local-task-1', text: 'Typed' }).name
    ).toBe('Typed');
    expect(
      resolveTaskWithNoteEditPreview(task, { taskId: 'local-task-1', text: 'Typed' }).stickyNoteColor
    ).toBe('yellow');
    const both = resolveTaskWithNoteEditPreview(task, {
      color: 'green',
      taskId: 'local-task-1',
      text: 'Typed',
    });
    expect(both.name).toBe('Typed');
    expect(both.stickyNoteColor).toBe('green');
  });
});

describe('isInlineNoteCreateDraft', () => {
  it('treats a local comment draft as inline create unless the composer owns it', () => {
    const task = draftTask({ localDraftKind: 'comment' });
    expect(isInlineNoteCreateDraft(task)).toBe(true);
    expect(isInlineNoteCreateDraft(task, { mode: 'comment', taskId: 'other' })).toBe(true);
    expect(isInlineNoteCreateDraft(task, { mode: 'comment', taskId: 'local-task-1' })).toBe(false);
    expect(isInlineNoteCreateDraft(draftTask({ localDraftKind: 'task' }))).toBe(false);
  });
});

describe('isInlineNoteEdit', () => {
  it('starts inline edit only for the composer comment target', () => {
    const task = draftTask({
      id: 'comment:note-1',
      isLocalTask: undefined,
      localDraftKind: 'comment',
    });
    expect(isInlineNoteEdit(task)).toBe(false);
    expect(isInlineNoteEdit(task, { mode: 'new', taskId: 'comment:note-1' })).toBe(false);
    expect(isInlineNoteEdit(task, { mode: 'comment', taskId: 'other' })).toBe(false);
    expect(isInlineNoteEdit(task, { mode: 'comment', taskId: 'comment:note-1' })).toBe(true);
  });
});

describe('buildInlineNoteDraftEditor', () => {
  it('saves trimmed text and the selected color', () => {
    const onCancel = vi.fn();
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const editor = buildInlineNoteDraftEditor({
      color: 'pink',
      placeholder: 'Note text',
      taskId: 'local-task-1',
      text: 'hello',
      onCancel,
      onChange,
      onSubmit,
    });

    editor.onSubmit();

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith('local-task-1', 'hello', 'pink');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not finish an empty draft on submit, only on cancel', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const editor = buildInlineNoteDraftEditor({
      color: 'yellow',
      placeholder: 'Note text',
      taskId: 'local-task-1',
      text: '   ',
      onCancel,
      onChange: vi.fn(),
      onSubmit,
    });

    expect(editor.showDisabledSave).toBe(true);
    editor.onSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    editor.onCancel();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledWith('local-task-1');
  });

  it('forwards typed text onto the draft card', () => {
    const onChange = vi.fn();
    const editor = buildInlineNoteDraftEditor({
      color: 'yellow',
      placeholder: 'Note text',
      taskId: 'local-task-1',
      text: '',
      onCancel: vi.fn(),
      onChange,
      onSubmit: vi.fn(),
    });

    editor.onChange('typed');
    expect(onChange).toHaveBeenCalledWith('local-task-1', 'typed');
    expect(editor.placeholder).toBe('Note text');
    expect(editor.onColorChange).toBeUndefined();
  });

  it('exposes a color change handler only for inline edit', () => {
    const onColorChange = vi.fn();
    const editor = buildInlineNoteDraftEditor({
      color: 'green',
      placeholder: 'Note text',
      taskId: 'comment:note-1',
      text: 'hello',
      onCancel: vi.fn(),
      onChange: vi.fn(),
      onColorChange,
      onSubmit: vi.fn(),
    });

    expect(editor.color).toBe('green');
    editor.onColorChange?.('pink');
    expect(onColorChange).toHaveBeenCalledWith('comment:note-1', 'pink');
  });
});

describe('resolvePlanSegmentInlineNoteEditor', () => {
  it('edits a saved note through the live preview, not the draft task fields', () => {
    const closeNoteComposer = vi.fn();
    const onEditColorChange = vi.fn();
    const onEditTextChange = vi.fn();
    const onSubmit = vi.fn();
    const editor = resolvePlanSegmentInlineNoteEditor({
      closeNoteComposer,
      displayColor: 'pink',
      displayText: 'Sticky',
      isCreateDraft: false,
      isEdit: true,
      placeholder: 'Note text',
      taskId: 'comment:note-1',
      toolColor: 'yellow',
      onEditColorChange,
      onEditTextChange,
      onSubmit,
    });

    expect(editor?.color).toBe('pink');
    expect(editor?.showDisabledSave).toBe(true);
    editor?.onChange('Typed');
    editor?.onColorChange?.('blue');
    editor?.onSubmit();
    editor?.onCancel();

    expect(onEditTextChange).toHaveBeenCalledWith('comment:note-1', 'Typed');
    expect(onEditColorChange).toHaveBeenCalledWith('comment:note-1', 'blue');
    expect(onSubmit).toHaveBeenCalledWith('comment:note-1', 'Sticky', 'pink');
    expect(closeNoteComposer).toHaveBeenCalledOnce();
  });

  it('shows the color selector on a create draft like on a saved note', () => {
    const onCreateColorChange = vi.fn();
    const editor = resolvePlanSegmentInlineNoteEditor({
      closeNoteComposer: vi.fn(),
      displayColor: 'green',
      displayText: 'Draft',
      isCreateDraft: true,
      isEdit: false,
      placeholder: 'Note text',
      taskId: 'local-task-1',
      toolColor: 'yellow',
      onCancelDraft: vi.fn(),
      onCreateColorChange,
      onCreateTextChange: vi.fn(),
      onEditColorChange: vi.fn(),
      onEditTextChange: vi.fn(),
      onSubmit: vi.fn(),
    });

    expect(editor?.color).toBe('green');
    expect(editor?.showDisabledSave).toBe(true);
    editor?.onColorChange?.('pink');
    expect(onCreateColorChange).toHaveBeenCalledWith('local-task-1', 'pink');
  });
});

describe('isInlineImageCreateDraft', () => {
  it('treats a local photo draft as inline create', () => {
    expect(isInlineImageCreateDraft(draftTask({ localDraftKind: 'image' }))).toBe(true);
    expect(isInlineImageCreateDraft(draftTask({ localDraftKind: 'comment' }))).toBe(false);
    expect(
      isInlineImageCreateDraft(
        draftTask({ id: 'local-image:1', isLocalTask: undefined, localDraftKind: 'image' })
      )
    ).toBe(false);
  });
});

describe('buildInlineImageDraftEditor', () => {
  it('saves caption with the photo url', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const editor = buildInlineImageDraftEditor({
      caption: 'Polaroid',
      imageUrl: 'blob:photo',
      isSubmitting: false,
      taskId: 'local-task-1',
      onCancel,
      onCaptionChange: vi.fn(),
      onImageUrlChange: vi.fn(),
      onSubmit,
    });

    editor.onSubmit();
    expect(onSubmit).toHaveBeenCalledWith('local-task-1', 'Polaroid', 'blob:photo');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('discards the draft when there is no photo', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const editor = buildInlineImageDraftEditor({
      caption: 'orphan caption',
      imageUrl: '  ',
      isSubmitting: false,
      taskId: 'local-task-1',
      onCancel,
      onCaptionChange: vi.fn(),
      onImageUrlChange: vi.fn(),
      onSubmit,
    });

    editor.onSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    editor.onCancel();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('usesIndependentSwimlaneCardRowBand', () => {
  it('keeps diagram cards on the duration-squared swimlane band', () => {
    expect(
      usesIndependentSwimlaneCardRowBand({
        hasCardRowOverride: true,
        isDiagramCard: true,
        isPhotoCard: false,
        isStickyNoteCard: false,
      })
    ).toBe(false);
  });

  it('lets notes and photos keep their own card-row height', () => {
    expect(
      usesIndependentSwimlaneCardRowBand({
        hasCardRowOverride: false,
        isDiagramCard: false,
        isPhotoCard: true,
        isStickyNoteCard: false,
      })
    ).toBe(true);
    expect(
      usesIndependentSwimlaneCardRowBand({
        hasCardRowOverride: false,
        isDiagramCard: false,
        isPhotoCard: false,
        isStickyNoteCard: true,
      })
    ).toBe(true);
  });
});

describe('isInlineDiagramCreateDraft', () => {
  it('treats a local diagram draft as inline create', () => {
    expect(isInlineDiagramCreateDraft(draftTask({ localDraftKind: 'diagram' }))).toBe(true);
    expect(isInlineDiagramCreateDraft(draftTask({ localDraftKind: 'image' }))).toBe(false);
    expect(
      isInlineDiagramCreateDraft(
        draftTask({ id: 'comment:d1', isLocalTask: undefined, localDraftKind: 'diagram' })
      )
    ).toBe(false);
  });
});

describe('buildInlineDiagramDraftEditor', () => {
  it('saves the on-card caption without requiring a name', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const editor = buildInlineDiagramDraftEditor({
      caption: '',
      isSubmitting: false,
      taskId: 'local-task-1',
      onCancel,
      onCaptionChange: vi.fn(),
      onSubmit,
    });

    editor.onSubmit();
    expect(onSubmit).toHaveBeenCalledWith('local-task-1', '');
    expect(onCancel).not.toHaveBeenCalled();
  });
});
