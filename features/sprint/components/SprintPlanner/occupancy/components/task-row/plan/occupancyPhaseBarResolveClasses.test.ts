import type { StatusColorGroup } from '@/utils/statusColors';
import type { CSSProperties } from 'react';

import { describe, expect, it } from 'vitest';

import {
  resolvePhaseBorderOnlyClass,
  resolvePhaseColorClass,
  resolvePhaseFillClass,
  resolvePhaseInternalWeekDividerClass,
} from './occupancyPhaseBarResolveClasses';

const closed: StatusColorGroup = {
  arrow: { default: '', hover: '' },
  bg: 'bg-green',
  border: 'border-green',
  highlight: { bg: '', border: '' },
  previewBorder: '',
  resizeHandle: { bg: '', line: '' },
  sidebar: '',
  tagBg: '',
  text: '',
};

const devBlue: StatusColorGroup = {
  arrow: { default: '', hover: '' },
  bg: 'bg-blue',
  border: 'border-blue',
  highlight: { bg: '', border: '' },
  previewBorder: '',
  resizeHandle: { bg: '', line: '' },
  sidebar: '',
  tagBg: '',
  text: '',
};

const baseCtx = {
  barColors: null,
  closedGreenColors: closed,
  devBlueColors: devBlue,
  forceDevColor: false,
  forceReleaseStyle: false,
  plannedInSprintVariant: false,
  qaStripedStyle: undefined,
  teamBorder: 'border-gray-300',
  teamColor: 'bg-gray-100',
  teamPlanVariant: false,
};

describe('resolvePhaseColorClass', () => {
  it('prefers barColors when set', () => {
    const cls = resolvePhaseColorClass({
      ...baseCtx,
      barColors: closed,
    });
    expect(cls).toContain('bg-green');
    expect(cls).toContain('border-green');
  });

  it('uses release closed green when forceReleaseStyle', () => {
    const cls = resolvePhaseColorClass({
      ...baseCtx,
      barColors: null,
      forceReleaseStyle: true,
    });
    expect(cls).toContain('bg-green');
  });

  it('uses dashed gray for team plan variant', () => {
    const cls = resolvePhaseColorClass({
      ...baseCtx,
      barColors: null,
      teamPlanVariant: true,
    });
    expect(cls).toContain('border-dashed');
    expect(cls).toContain('bg-gray-200');
  });

  it('uses dev blue when forceDevColor', () => {
    const cls = resolvePhaseColorClass({
      ...baseCtx,
      barColors: null,
      forceDevColor: true,
    });
    expect(cls).toContain('bg-blue');
  });
});

describe('resolvePhaseInternalWeekDividerClass', () => {
  it('uses dashed border-l in phase border color for forceDevColor', () => {
    const cls = resolvePhaseInternalWeekDividerClass({
      ...baseCtx,
      barColors: null,
      forceDevColor: true,
    });
    expect(cls).toContain('border-l-2');
    expect(cls).toContain('border-dashed');
    expect(cls).toContain('border-blue');
  });
});

describe('resolvePhaseBorderOnlyClass', () => {
  it('team plan variant returns dashed border only', () => {
    const cls = resolvePhaseBorderOnlyClass({
      ...baseCtx,
      teamPlanVariant: true,
    });
    expect(cls).toContain('border-dashed');
    expect(cls).not.toContain('bg-');
  });
});

describe('resolvePhaseFillClass', () => {
  it('team plan variant returns gray fill', () => {
    expect(
      resolvePhaseFillClass({
        ...baseCtx,
        teamPlanVariant: true,
      })
    ).toBe('bg-gray-200 dark:bg-gray-600');
  });

  it('returns empty string when qaStripedStyle without higher-priority branch', () => {
    expect(
      resolvePhaseFillClass({
        ...baseCtx,
        qaStripedStyle: { background: 'x' } as CSSProperties,
      })
    ).toBe('');
  });
});
