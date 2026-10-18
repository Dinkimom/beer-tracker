import { describe, expect, it } from 'vitest';

import {
  getStickyNoteCardStyle,
  getStickyNoteDashedGhostStyle,
  getStickyNoteGhostGlyphColor,
  getStickyNotePaint,
  getStickyNotePendingApprovalCardStyle,
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
    expect(yellow.border).toBe('#f4d454');
    expect(getStickyNotePaint('gray').border).toBe('#e0e3e8');
  });

  it('keeps dark-mode notes on deeper paper with light ink', () => {
    const light = getStickyNotePaint('yellow', false);
    const paper = getStickyNotePaint('yellow', true);
    expect(paper.background).not.toBe(light.background);
    expect(paper.background).toBe('#e0bb00');
    expect(paper.text).toBe('#2a1604');
    expect(paper.text).not.toBe(light.text);
    expect(getStickyNotePaint('green', true).background).toBe('#28c361');
    expect(getStickyNotePaint('pink', true).text).toBe('#fff4f8');
  });

  it('paints a dashed square ghost in the selected note color', () => {
    const ghost = getStickyNoteDashedGhostStyle('pink');
    expect(ghost.borderRadius).toBe(0);
    expect(ghost.borderStyle).toBe('dashed');
    expect(ghost.borderColor).toBe(getStickyNotePaint('pink').border);
    expect(ghost.borderWidth).toBe(getStickyNoteCardStyle('pink').borderWidth);
    expect(ghost.color).toBe(getStickyNoteGhostGlyphColor('pink'));
    expect(String(ghost.backgroundColor)).toContain('rgba(');
  });

  it('keeps pending agent notes on the same paper with a dashed border', () => {
    const pending = getStickyNotePendingApprovalCardStyle('yellow');
    const solid = getStickyNoteCardStyle('yellow');
    expect(pending.backgroundColor).toBe(solid.backgroundColor);
    expect(pending.color).toBe(solid.color);
    expect(pending.borderStyle).toBe('dashed');
    expect(pending.borderWidth).toBe(2);
  });

  it('draws the plus in the selected hue instead of ink or the paper fill', () => {
    expect(getStickyNoteGhostGlyphColor('green')).toBe('#15803d');
    expect(getStickyNoteGhostGlyphColor('yellow')).toBe('#a16207');
    expect(getStickyNoteGhostGlyphColor('yellow')).not.toBe(getStickyNoteGhostGlyphColor('green'));
    expect(getStickyNoteGhostGlyphColor('green')).not.toBe(getStickyNotePaint('green').text);
    expect(getStickyNoteGhostGlyphColor('green')).not.toBe(getStickyNotePaint('green').background);
  });

  it('paints resize handles from the same note palette', () => {
    const pink = getStickyNoteResizeHandlePaint('pink');
    const yellow = getStickyNoteResizeHandlePaint('yellow');
    expect(pink.line).toBe(getStickyNoteGhostGlyphColor('pink'));
    expect(pink.activeBackground).not.toBe(yellow.activeBackground);
    expect(pink.hoverBackground).not.toBe(pink.activeBackground);
    expect(pink.activeBackground.startsWith('rgba(')).toBe(true);
    expect(getStickyNoteResizeHandlePaint('yellow', true).line).toBe(
      getStickyNotePaint('yellow', true).text
    );
  });
});
