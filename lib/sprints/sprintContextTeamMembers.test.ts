import type { SprintContextCapacityReport } from './sprintContextTypes';
import type { Developer } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  lookupTeamMemberRole,
  sprintContextTeamMemberFromDeveloper,
  stampCapacityWithTeamRoles,
} from './sprintContextTeamMembers';

describe('sprintContextTeamMemberFromDeveloper', () => {
  it('maps developer role fields and staffUid from staff: assignee id', () => {
    const developer: Developer = {
      email: 'a@example.com',
      id: 'staff:11111111-1111-4111-8111-111111111111',
      name: 'Ada',
      platforms: ['web'],
      role: 'developer',
      roleTitle: 'Frontend',
    };
    expect(sprintContextTeamMemberFromDeveloper(developer)).toEqual({
      assigneeId: 'staff:11111111-1111-4111-8111-111111111111',
      assigneeName: 'Ada',
      email: 'a@example.com',
      platforms: ['web'],
      role: 'developer',
      roleTitle: 'Frontend',
      staffUid: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('keeps tracker assignee ids without inventing staffUid', () => {
    const developer: Developer = {
      id: 'tracker-user-1',
      name: 'Bea',
      role: 'tester',
      roleTitle: 'QA',
    };
    expect(sprintContextTeamMemberFromDeveloper(developer)).toEqual({
      assigneeId: 'tracker-user-1',
      assigneeName: 'Bea',
      role: 'tester',
      roleTitle: 'QA',
    });
  });
});

describe('stampCapacityWithTeamRoles', () => {
  it('stamps matching capacity people and overloaded rows', () => {
    const capacity: SprintContextCapacityReport = {
      overloaded: [{ assigneeId: 'dev-1', day: 0, loadParts: 3 }],
      people: [
        {
          assigneeId: 'dev-1',
          days: [],
          gaps: [],
          overlaps: [],
          totalLoadParts: 3,
          totalMaxParts: 2,
        },
        {
          assigneeId: 'dev-2',
          days: [],
          gaps: [],
          overlaps: [],
          totalLoadParts: 0,
          totalMaxParts: 2,
        },
      ],
      summary: '2 assignee(s)',
    };
    const stamped = stampCapacityWithTeamRoles(capacity, [
      {
        assigneeId: 'dev-1',
        assigneeName: 'Ada',
        platforms: ['back'],
        role: 'developer',
        roleTitle: 'Backend',
      },
    ]);
    expect(stamped.people[0]).toMatchObject({
      platforms: ['back'],
      role: 'developer',
      roleTitle: 'Backend',
    });
    expect(stamped.people[1]?.role).toBeUndefined();
    expect(stamped.overloaded[0]).toMatchObject({
      role: 'developer',
      roleTitle: 'Backend',
    });
  });
});

describe('lookupTeamMemberRole', () => {
  it('finds by any of the provided keys', () => {
    const member = {
      assigneeId: 'tracker-1',
      assigneeName: 'Ada',
      role: 'developer' as const,
      roleTitle: 'Frontend',
      staffUid: '11111111-1111-4111-8111-111111111111',
    };
    const index = new Map([
      [member.assigneeId, member],
      [member.staffUid!, member],
      [`staff:${member.staffUid}`, member],
    ]);
    expect(lookupTeamMemberRole(index, [null, 'staff:11111111-1111-4111-8111-111111111111'])).toBe(
      member
    );
    expect(lookupTeamMemberRole(index, ['missing'])).toBeUndefined();
  });
});
