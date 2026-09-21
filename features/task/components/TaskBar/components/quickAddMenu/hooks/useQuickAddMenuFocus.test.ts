/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  focusQuickAddMenuInput,
  resolveQuickAddMenuFocusTarget,
} from './useQuickAddMenuFocus';

describe('resolveQuickAddMenuFocusTarget', () => {
  const commentInput = document.createElement('textarea');
  const imageCaptionInput = document.createElement('input');
  const imageDropzone = document.createElement('label');
  const newTaskInput = document.createElement('textarea');
  const searchInput = document.createElement('input');

  it('returns the comment field in comment mode', () => {
    expect(
      resolveQuickAddMenuFocusTarget({
        commentInput,
        mode: 'comment',
        newTaskInput,
        searchInput,
      })
    ).toBe(commentInput);
  });

  it('returns the diagram name field in diagram mode', () => {
    const diagramNameInput = document.createElement('input');
    expect(
      resolveQuickAddMenuFocusTarget({
        commentInput,
        diagramNameInput,
        mode: 'diagram',
        newTaskInput,
        searchInput,
      })
    ).toBe(diagramNameInput);
  });

  it('returns the new-task field in new mode', () => {
    expect(
      resolveQuickAddMenuFocusTarget({
        commentInput,
        mode: 'new',
        newTaskInput,
        searchInput,
      })
    ).toBe(newTaskInput);
  });

  it('focuses the dropzone before a file is chosen', () => {
    expect(
      resolveQuickAddMenuFocusTarget({
        commentInput,
        imageCaptionInput,
        imageDropzone,
        mode: 'image',
        newTaskInput,
        searchInput,
      })
    ).toBe(imageDropzone);
  });

  it('focuses the caption after an image is chosen', () => {
    expect(
      resolveQuickAddMenuFocusTarget({
        commentInput,
        imageCaptionInput,
        imageDropzone,
        imageUrl: 'blob:1',
        mode: 'image',
        newTaskInput,
        searchInput,
      })
    ).toBe(imageCaptionInput);
  });

  it('does not steal focus in the absence form', () => {
    expect(
      resolveQuickAddMenuFocusTarget({
        commentInput,
        mode: 'availability',
        newTaskInput,
        searchInput,
      })
    ).toBeNull();
  });
});

describe('focusQuickAddMenuInput', () => {
  it('focuses the field and places the caret at the end', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Sticky text';
    document.body.appendChild(textarea);

    focusQuickAddMenuInput(textarea);

    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe('Sticky text'.length);
    expect(textarea.selectionEnd).toBe('Sticky text'.length);
    textarea.remove();
  });

  it('focuses a non-text control without requiring a selection', () => {
    const dropzone = document.createElement('label');
    dropzone.tabIndex = 0;
    document.body.appendChild(dropzone);

    focusQuickAddMenuInput(dropzone);

    expect(document.activeElement).toBe(dropzone);
    dropzone.remove();
  });
});
