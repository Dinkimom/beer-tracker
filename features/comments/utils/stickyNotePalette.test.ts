import { describe, expect, it } from 'vitest';

import {
  getStickyNoteCardStyle,
  getStickyNoteDashedGhostStyle,
  getStickyNoteGhostGlyphColor,
  getStickyNotePaint,
  getStickyNoteResizeHandlePaint,
} from './stickyNotePalette';

describe('stickyNotePalette', () => {
  it('returns distinct fills for each note color', () => {
    const yellow = getStickyNotePaint('yellow').background;
    const pink = getStickyNotePaint('pink').background;
    const green = getStickyNotePaint('green').background;
    const blue = getStickyNotePaint('blue').background;
    const gray = getStickyNotePaint('gray').background;

    expect(new Set([yellow, pink, green, blue, gray]).size).toBe(5);
  });

  it('paints the card through inline styles so the fill does not depend on Tailwind JIT', () => {
    const style = getStickyNoteCardStyle('pink');
    expect(style.backgroundColor).toBe(getStickyNotePaint('pink').background);
    expect(style.borderColor).toBe(getStickyNotePaint('pink').border);
    expect(style.color).toBe(getStickyNotePaint('pink').text);
    expect(style.borderWidth).toBe(1);
    expect(style.borderRadius).toBe(0);
  });

  it('keeps the light-theme paper edge close to the fill instead of an ink outline', () => {
    const yellow = getStickyNotePaint('yellow');
    expect(yellow.border).not.toBe(yellow.text);
    expect(yellow.border).toBe('#f3e27a');
    expect(getStickyNotePaint('gray').border).toBe('#d1d5db');
  });

  it('uses a darker fill in dark mode', () => {
    expect(getStickyNotePaint('yellow', true).background).not.toBe(
      getStickyNotePaint('yellow', false).background
    );
  });

  it('paints a dashed square ghost in the selected note color', () => {
    const ghost = getStickyNoteDashedGhostStyle('pink');
    expect(ghost.borderRadius).toBe(0);
    expect(ghost.borderStyle).toBe('dashed');
    expect(ghost.borderColor).toBe(getStickyNotePaint('pink').border);
    expect(ghost.color).toBe(getStickyNoteGhostGlyphColor('pink'));
    expect(String(ghost.backgroundColor)).toContain('rgba(');
  });

  it('draws the plus in the selected hue instead of ink black or paper white', () => {
    expect(getStickyNoteGhostGlyphColor('green', false)).toBe(
      getStickyNotePaint('green', true).swatch
    );
    expect(getStickyNoteGhostGlyphColor('green', true)).toBe(
      getStickyNotePaint('green', false).swatch
    );
    expect(getStickyNoteGhostGlyphColor('yellow', false)).not.toBe(
      getStickyNoteGhostGlyphColor('green', false)
    );
    expect(getStickyNoteGhostGlyphColor('green', false)).not.toBe(
      getStickyNotePaint('green', false).text
    );
  });

  it('paints resize handles from the same note palette', () => {
    const pink = getStickyNoteResizeHandlePaint('pink');
    const yellow = getStickyNoteResizeHandlePaint('yellow');
    expect(pink.line).toBe(getStickyNotePaint('pink', true).background);
    expect(pink.activeBackground).not.toBe(yellow.activeBackground);
    expect(pink.hoverBackground).not.toBe(pink.activeBackground);
    expect(pink.activeBackground.startsWith('rgba(')).toBe(true);
  });
});
