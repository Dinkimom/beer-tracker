/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getStickyNotePaint } from '@/features/comments/utils/stickyNotePalette';

import { StickyNoteToolIcon } from './StickyNoteToolIcon';

describe('StickyNoteToolIcon', () => {
  it('uses the Lucide folded-note silhouette with a currentColor stroke', () => {
    const { container } = render(<StickyNoteToolIcon color="pink" />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    expect(paths[0]?.getAttribute('stroke')).toBe('currentColor');
    expect(paths[0]?.getAttribute('fill')).toBe(getStickyNotePaint('pink').swatch);
    expect(paths[0]?.getAttribute('d')).toContain('M16 3H5');
    expect(paths[1]?.getAttribute('d')).toContain('M15 3v4');
  });

  it('uses a white stroke on the filled glyph in dark theme', () => {
    const { container } = render(<StickyNoteToolIcon color="yellow" isDark />);
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('#fff');
  });

  it('keeps the picker glyph as a stroke-only Lucide note', () => {
    const { container } = render(<StickyNoteToolIcon variant="outline" />);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('none');
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('currentColor');
  });
});
