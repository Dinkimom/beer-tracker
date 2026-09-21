/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  doesStickyNoteCommentContentOverflow,
  isStickyNoteCommentContentOverflowFlagSet,
  STICKY_NOTE_CONTENT_DATA_ATTR,
  STICKY_NOTE_CONTENT_OVERFLOW_DATA_ATTR,
  syncStickyNoteCommentContentOverflowFlag,
} from './stickyNoteCommentContentOverflow';

describe('doesStickyNoteCommentContentOverflow', () => {
  it('detects clipped plain-text sticky notes', () => {
    const root = document.createElement('div');
    root.setAttribute(STICKY_NOTE_CONTENT_DATA_ATTR, '');
    const clamped = document.createElement('span');
    clamped.setAttribute('data-sticky-note-clamped-text', '');
    Object.defineProperty(clamped, 'clientHeight', { configurable: true, value: 20 });
    Object.defineProperty(clamped, 'scrollHeight', { configurable: true, value: 40 });
    root.appendChild(clamped);

    expect(doesStickyNoteCommentContentOverflow(root)).toBe(true);
  });

  it('treats fully visible plain-text sticky notes as not overflowing', () => {
    const root = document.createElement('div');
    root.setAttribute(STICKY_NOTE_CONTENT_DATA_ATTR, '');
    const clamped = document.createElement('span');
    clamped.setAttribute('data-sticky-note-clamped-text', '');
    Object.defineProperty(clamped, 'clientHeight', { configurable: true, value: 40 });
    Object.defineProperty(clamped, 'scrollHeight', { configurable: true, value: 40 });
    root.appendChild(clamped);

    expect(doesStickyNoteCommentContentOverflow(root)).toBe(false);
  });

  it('detects clipped markdown sticky notes', () => {
    const root = document.createElement('div');
    root.setAttribute(STICKY_NOTE_CONTENT_DATA_ATTR, '');
    root.dataset.stickyNoteMarkdown = 'true';
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 48 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 96 });

    expect(doesStickyNoteCommentContentOverflow(root)).toBe(true);
  });
});

describe('syncStickyNoteCommentContentOverflowFlag', () => {
  it('writes the overflow flag onto the content root', () => {
    const root = document.createElement('div');
    root.setAttribute(STICKY_NOTE_CONTENT_DATA_ATTR, '');
    const clamped = document.createElement('span');
    clamped.setAttribute('data-sticky-note-clamped-text', '');
    Object.defineProperty(clamped, 'clientHeight', { configurable: true, value: 20 });
    Object.defineProperty(clamped, 'scrollHeight', { configurable: true, value: 20 });
    root.appendChild(clamped);

    syncStickyNoteCommentContentOverflowFlag(root);

    expect(isStickyNoteCommentContentOverflowFlagSet(root)).toBe(false);
    expect(root.getAttribute(STICKY_NOTE_CONTENT_OVERFLOW_DATA_ATTR)).toBe('false');
  });
});
