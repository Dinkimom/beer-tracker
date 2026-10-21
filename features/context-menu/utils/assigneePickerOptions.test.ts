import type { Developer } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  assigneePlatformIsSuitable,
  buildAssigneeAvailabilitySegments,
  getAssigneePlatformOrder,
  groupAssigneesByPlatform,
} from './assigneePickerOptions';

const dev = (id: string, extra: Partial<Developer> = {}): Developer => ({
  id,
  name: id,
  role: 'developer',
  ...extra,
});

describe('getAssigneePlatformOrder', () => {
  it('puts the task platform first', () => {
    expect(getAssigneePlatformOrder('qa')).toEqual(['QA', 'Back', 'Web', 'Other']);
    expect(getAssigneePlatformOrder('back')).toEqual(['Back', 'Web', 'QA', 'Other']);
    expect(getAssigneePlatformOrder('web')).toEqual(['Web', 'Back', 'QA', 'Other']);
  });

  it('falls back to Back first when the team is unknown', () => {
    expect(getAssigneePlatformOrder(undefined)).toEqual(['Back', 'Web', 'QA', 'Other']);
  });
});

describe('assigneePlatformIsSuitable', () => {
  it('marks the matching platform when the task platform is set', () => {
    expect(assigneePlatformIsSuitable('Back', 'Back')).toBe(true);
    expect(assigneePlatformIsSuitable('Web', 'Back')).toBe(false);
    expect(assigneePlatformIsSuitable('QA', 'QA')).toBe(true);
    expect(assigneePlatformIsSuitable('Back', 'DevOps')).toBe(true);
    expect(assigneePlatformIsSuitable('Web', 'DevOps')).toBe(true);
    expect(assigneePlatformIsSuitable('QA', 'DevOps')).toBe(false);
  });

  it('does not mark a group when the task has no platform', () => {
    expect(assigneePlatformIsSuitable('Back', undefined)).toBe(false);
    expect(assigneePlatformIsSuitable('Back', '')).toBe(false);
  });
});

describe('groupAssigneesByPlatform', () => {
  it('groups by platform in task order and skips empty groups', () => {
    const groups = groupAssigneesByPlatform(
      [
        dev('back1', { platforms: ['back'] }),
        dev('web1', { platforms: ['web'] }),
        dev('qa1', { role: 'tester' }),
        dev('web2', { platforms: ['web'] }),
      ],
      'Web'
    );

    expect(groups.map((g) => [g.platformKey, g.suitable, g.developers.map((d) => d.id)])).toEqual([
      ['Web', true, ['web1', 'web2']],
      ['Back', false, ['back1']],
      ['QA', false, ['qa1']],
    ]);
  });

  it('puts developers without a platform into Other', () => {
    expect(groupAssigneesByPlatform([dev('x')], undefined)).toEqual([
      { developers: [dev('x')], platformKey: 'Other', suitable: false },
    ]);
  });
});

describe('buildAssigneeAvailabilitySegments', () => {
  it('returns an empty map when availability is missing', () => {
    expect(
      buildAssigneeAvailabilitySegments({
        developers: [dev('d1')],
        sprintStartDate: new Date('2026-01-01'),
      })
    ).toEqual(new Map());
  });
});
