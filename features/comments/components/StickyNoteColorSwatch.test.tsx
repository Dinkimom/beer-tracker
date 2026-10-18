/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getStickyNotePaint } from '@/features/comments/utils/stickyNotePalette';

import { StickyNoteColorSwatch } from './StickyNoteColorSwatch';

describe('StickyNoteColorSwatch', () => {
  it('paints ordinary colors as a paper dot', () => {
    const { container } = render(<StickyNoteColorSwatch color="pink" />);
    const dot = container.querySelector('span');
    expect(dot?.style.backgroundColor).toBe('rgb(255, 192, 224)');
    expect(getStickyNotePaint('pink').swatch).toBe('#ffc0e0');
  });
});
