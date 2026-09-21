import { describe, expect, it } from 'vitest';

import {
  getStickyNoteContentLayoutClass,
  getStickyNoteContentSpacingClass,
  getStickyNoteDeleteButtonClasses,
  getStickyNoteLocalDraftBorderClasses,
  getStickyNoteLocalDraftSurfaceClasses,
  getStickyNotePlaceholderTextClass,
  getStickyNoteTextClass,
  resolveStickyNoteDisplayModes,
} from './stickyNoteSurfaceClasses';

describe('stickyNoteSurfaceClasses', () => {
  it('uses Excalifont on sticky note surface and text', () => {
    expect(getStickyNoteLocalDraftSurfaceClasses()).toContain('font-excalifont');
    expect(getStickyNoteTextClass()).toContain('font-excalifont');
    expect(getStickyNoteTextClass()).toContain('font-normal');
    expect(getStickyNotePlaceholderTextClass()).toContain('font-excalifont');
  });

  it('uses the same compact text size at any card width', () => {
    expect(resolveStickyNoteDisplayModes().textSize).toBe('text-xs');
    expect(resolveStickyNoteDisplayModes().lineHeightClass).toBe('leading-snug');
  });

  it('keeps content spacing tight under the folded corner', () => {
    expect(getStickyNoteLocalDraftSurfaceClasses()).toContain('!pt-2');
    expect(getStickyNoteLocalDraftSurfaceClasses()).not.toContain('!pt-3.5');
    expect(getStickyNoteContentSpacingClass()).toBe('my-0');
  });

  it('renders sticky notes with square corners', () => {
    expect(getStickyNoteLocalDraftSurfaceClasses()).toContain('!rounded-none');
  });

  it('renders sticky notes without drop shadow', () => {
    expect(getStickyNoteLocalDraftSurfaceClasses()).toContain('shadow-none');
    expect(getStickyNoteLocalDraftSurfaceClasses()).not.toContain('sticky-note-card');
  });

  it('renders sticky notes flat without perspective skew', () => {
    const surface = getStickyNoteLocalDraftSurfaceClasses();
    expect(surface).not.toContain('skewX');
    expect(surface).not.toContain('rotateX');
    expect(surface).not.toContain('perspective');
  });

  it('centers sticky note text in the card', () => {
    expect(getStickyNoteContentLayoutClass()).toContain('items-center');
    expect(getStickyNoteContentLayoutClass()).toContain('justify-center');
    expect(getStickyNoteContentLayoutClass()).toContain('text-center');
  });

  it('does not encode fill in Tailwind classes — paint comes from inline styles', () => {
    expect(getStickyNoteLocalDraftSurfaceClasses()).not.toContain('bg-yellow-200');
    expect(getStickyNoteLocalDraftSurfaceClasses()).not.toContain('bg-pink-200');
    expect(getStickyNoteLocalDraftBorderClasses()).toBe('');
    expect(getStickyNotePlaceholderTextClass()).toContain('opacity-50');
    expect(getStickyNoteDeleteButtonClasses()).toContain('rounded-full');
  });
});
