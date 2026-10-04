import { describe, expect, it } from 'vitest';

import {
  canonicalPaletteKey,
  getPhaseDividerClasses,
  getPreviewBorderColor,
  getQAStripedPattern,
  getQaStripedStyles,
  getResizeHandleColors,
  getStatusColors,
  getStatusPaletteRuLabel,
  getSwimlaneTaskCardChipClassNames,
  listDistinctStatusPaletteKeys,
  listStatusPaletteKeys,
  resolvePaletteStatusKey,
  resolveResizeHandleHoverBgClass,
  resolveStatusForPhaseCardColors,
} from './statusColors';

function darkToken(classes: string | undefined, kind: 'bg' | 'border' | 'text'): string | undefined {
  return classes?.split(/\s+/).find((token) => token.startsWith(`dark:${kind}-`));
}

describe('resolvePaletteStatusKey', () => {
  it('prefers override', () => {
    expect(resolvePaletteStatusKey('review', 'closed')).toBe('closed');
  });

  it('falls back to original', () => {
    expect(resolvePaletteStatusKey('review', '')).toBe('review');
    expect(resolvePaletteStatusKey('review', undefined)).toBe('review');
  });
});

describe('sidebar dark palette', () => {
  it('uses the same fill, border, and text as swimlane cards', () => {
    const keys = [...listStatusPaletteKeys(), 'unknown-status'];
    for (const key of keys) {
      const colors = getStatusColors(key);
      expect(darkToken(colors.sidebarDark, 'bg'), key).toBe(colors.bgDark);
      expect(darkToken(colors.sidebarDark, 'border'), key).toBe(colors.borderDark);
      expect(darkToken(colors.sidebarDark, 'text'), key).toBe(colors.textDark);
    }
  });
});

describe('getSwimlaneTaskCardChipClassNames', () => {
  it('mirrors swimlane card surface + border tokens', () => {
    const s = getSwimlaneTaskCardChipClassNames('closed');
    expect(s).toContain('rounded-lg');
    expect(s).toContain('border-2');
    expect(s).toMatch(/bg-/);
    expect(s).toMatch(/border-/);
  });

  it('exposes brown palette for admin visualToken mapping', () => {
    expect(listStatusPaletteKeys()).toContain('brown');
    expect(listDistinctStatusPaletteKeys()).toContain('brown');
    expect(getSwimlaneTaskCardChipClassNames('brown')).toContain('bg-brown-100');
    expect(getSwimlaneTaskCardChipClassNames('brown')).toContain('dark:bg-brown-900');
  });
});

describe('getStatusPaletteRuLabel', () => {
  it('covers every palette key with a non-empty label', () => {
    for (const pk of listStatusPaletteKeys()) {
      expect(getStatusPaletteRuLabel(pk).length).toBeGreaterThan(0);
    }
  });

  it('uses Russian color family only (no technical key in the label)', () => {
    expect(getStatusPaletteRuLabel('backlog')).toBe('Белый');
    expect(getStatusPaletteRuLabel('closed')).toBe('Зелёный');
    expect(getStatusPaletteRuLabel('readyfordevelopment')).toBe('Серый');
    expect(getStatusPaletteRuLabel('review')).toBe('Розовый');
  });

  it('unknown keys get neutral gray label', () => {
    expect(getStatusPaletteRuLabel('custom_status_from_tracker')).toBe('Серый');
  });
});

describe('canonicalPaletteKey / listDistinctStatusPaletteKeys', () => {
  it('merges visually identical grays to one canonical key', () => {
    expect(canonicalPaletteKey('transferredtodevelopment')).toBe('readyfordevelopment');
    expect(listDistinctStatusPaletteKeys().includes('transferredtodevelopment')).toBe(false);
    expect(listDistinctStatusPaletteKeys().includes('readyfordevelopment')).toBe(true);
  });

  it('distinct list is not longer than full palette', () => {
    expect(listDistinctStatusPaletteKeys().length).toBeLessThanOrEqual(listStatusPaletteKeys().length);
  });
});

describe('resolveStatusForPhaseCardColors', () => {
  it('uses palette override in status scheme', () => {
    expect(resolveStatusForPhaseCardColors('status', 'review', 'closed')).toBe('closed');
  });

  it('monochrome ignores palette', () => {
    expect(resolveStatusForPhaseCardColors('monochrome', 'review', 'closed')).toBe('backlog');
  });
});

describe('getQAStripedPattern / getQaStripedStyles', () => {
  it('uses neutral backlog stripes for unknown statuses (e.g. open), not orange ready-for-test', () => {
    const openStripes = getQAStripedPattern('open');
    expect(openStripes?.backgroundImage).toContain('249, 250, 251');
    expect(openStripes?.backgroundImage).not.toContain('255, 247, 237');

    const light = getQaStripedStyles('open', false);
    expect(light.style?.backgroundImage).toContain('249, 250, 251');

    const dark = getQaStripedStyles('open', true);
    expect(dark.style?.backgroundImage).toContain('55, 65, 81');
  });
});

describe('resolveResizeHandleHoverBgClass / getResizeHandleColors', () => {
  it('maps active /60 backdrop to a static /20 hover class for Tailwind JIT', () => {
    expect(resolveResizeHandleHoverBgClass('bg-blue-200/60')).toBe('bg-blue-200/20');
    expect(resolveResizeHandleHoverBgClass('dark:bg-blue-700/60')).toBe('dark:bg-blue-700/20');

    const colors = getResizeHandleColors('inProgress', false, 'status');
    expect(colors.hoverBg).toBe('bg-blue-200/20');
    expect(colors.hoverBgDark).toBe('dark:bg-blue-700/20');
  });

  it('uses the card palette for QA tasks, including review and inReview', () => {
    const reviewCard = getStatusColors('inreview');
    const qaHandle = getResizeHandleColors('inreview', true, 'status');
    const devHandle = getResizeHandleColors('inreview', false, 'status');

    expect(qaHandle.bg).toBe(reviewCard.resizeHandle.bg);
    expect(qaHandle.bg).toBe(devHandle.bg);
    expect(qaHandle.bg).not.toBe(getStatusColors('backlog').resizeHandle.bg);

    expect(getPreviewBorderColor('review', true)).toBe(getStatusColors('review').previewBorder);
    expect(getPhaseDividerClasses('inreview', true)).toBe('bg-pink-300 dark:bg-pink-700');
  });
});
