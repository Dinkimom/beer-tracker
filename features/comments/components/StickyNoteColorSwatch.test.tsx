/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getStickyNotePaint } from '@/features/comments/utils/stickyNotePalette';

import { StickyNoteColorSwatch } from './StickyNoteColorSwatch';

describe('StickyNoteColorSwatch', () => {
  it('paints the sheet and its folded corner with the card paper', () => {
    const { container } = render(<StickyNoteColorSwatch color="pink" />);
    const [sheet, fold] = container.querySelectorAll('path');
    const paint = getStickyNotePaint('pink');
    expect(sheet?.getAttribute('fill')).toBe(paint.background);
    expect(fold?.getAttribute('fill')).toBe(paint.border);
  });

  it('uses dark paint in dark theme', () => {
    const { container } = render(<StickyNoteColorSwatch color="blue" isDark />);
    const sheet = container.querySelector('path');
    expect(sheet?.getAttribute('fill')).toBe(getStickyNotePaint('blue', true).background);
  });
});
