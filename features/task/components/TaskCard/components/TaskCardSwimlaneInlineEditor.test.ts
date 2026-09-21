import type { KeyboardEvent } from 'react';

import { describe, expect, it, vi } from 'vitest';

import { handleInlineNoteEditorKeyDown } from './TaskCardSwimlaneInlineEditor';

function keyEvent(key: string, extras: { ctrlKey?: boolean; metaKey?: boolean } = {}) {
  return {
    key,
    ctrlKey: extras.ctrlKey ?? false,
    metaKey: extras.metaKey ?? false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent<HTMLTextAreaElement>;
}

describe('handleInlineNoteEditorKeyDown', () => {
  it('lets mention autocomplete consume Escape and Enter', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const event = keyEvent('Escape');
    handleInlineNoteEditorKeyDown({
      event,
      mentionKeyHandled: true,
      onCancel,
      onSubmit,
    });
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels the draft on Escape when mentions are closed', () => {
    const onCancel = vi.fn();
    const event = keyEvent('Escape');
    handleInlineNoteEditorKeyDown({
      event,
      mentionKeyHandled: false,
      onCancel,
    });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('submits on Cmd/Ctrl+Enter when mentions are closed', () => {
    const onSubmit = vi.fn();
    const event = keyEvent('Enter', { metaKey: true });
    handleInlineNoteEditorKeyDown({
      event,
      mentionKeyHandled: false,
      onSubmit,
    });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
