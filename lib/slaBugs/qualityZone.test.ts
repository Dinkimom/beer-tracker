import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildSlaBugQualityZoneSnapshot,
  computeNeedToCloseForZone,
  computeNeedToCloseCounts,
  computeSlaBugQualityZone,
  getNextSlaBugQualityZone,
} from './qualityZone';

function bug(id: string, incidentSeverity?: string): Task {
  return {
    id,
    name: id,
    link: `https://tracker.yandex.ru/${id}`,
    team: 'Back',
    type: 'bug',
    incidentSeverity,
  };
}

describe('qualityZone', () => {
  it('computeNeedToCloseCounts counts only P0–P2', () => {
    const counts = computeNeedToCloseCounts([
      bug('B-1', 'P0'),
      bug('B-2', 'P1'),
      bug('B-3', 'P2'),
      bug('B-4', 'P3'),
      bug('B-5', 'P4'),
    ]);

    expect(counts).toEqual({ P0: 1, P1: 1, P2: 1 });
  });

  it('computeSlaBugQualityZone is green when P0=0 and P1 below yellow threshold', () => {
    expect(computeSlaBugQualityZone({ P0: 0, P1: 0, P2: 0 })).toBe('green');
    expect(computeSlaBugQualityZone({ P0: 0, P1: 0, P2: 5 })).toBe('green');
    expect(computeSlaBugQualityZone({ P0: 0, P1: 0, P2: 10 })).toBe('green');
  });

  it('computeSlaBugQualityZone is red when P0 is open', () => {
    expect(computeSlaBugQualityZone({ P0: 1, P1: 0, P2: 0 })).toBe('red');
    expect(computeSlaBugQualityZone({ P0: 1, P1: 1, P2: 5 })).toBe('red');
  });

  it('computeSlaBugQualityZone is red when P1 reaches red threshold', () => {
    expect(computeSlaBugQualityZone({ P0: 0, P1: 2, P2: 5 })).toBe('red');
    expect(computeSlaBugQualityZone({ P0: 0, P1: 4, P2: 0 })).toBe('red');
  });

  it('computeSlaBugQualityZone is yellow for one active P1 without P0', () => {
    expect(computeSlaBugQualityZone({ P0: 0, P1: 1, P2: 5 })).toBe('yellow');
  });

  it('getNextSlaBugQualityZone returns the next better zone', () => {
    expect(getNextSlaBugQualityZone('red')).toBe('yellow');
    expect(getNextSlaBugQualityZone('yellow')).toBe('green');
    expect(getNextSlaBugQualityZone('green')).toBeNull();
  });

  it('computeNeedToCloseForZone uses yellow caps P0=0, P1=1, P2=2', () => {
    expect(computeNeedToCloseForZone({ P0: 0, P1: 2, P2: 5 }, 'yellow')).toEqual({
      P0: 0,
      P1: 1,
      P2: 3,
    });
  });

  it('buildSlaBugQualityZoneSnapshot aggregates counts and zone', () => {
    const snapshot = buildSlaBugQualityZoneSnapshot([
      bug('B-1', 'P1'),
      bug('B-2', 'P1'),
      bug('B-3', 'P2'),
    ]);

    expect(snapshot).toEqual({
      needToClose: { P0: 0, P1: 2, P2: 1 },
      zone: 'red',
    });
  });
});
