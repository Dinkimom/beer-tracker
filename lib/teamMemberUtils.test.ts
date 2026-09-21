import type { Developer } from '@/types';
import type { TeamMember } from '@/types/team';

import { describe, expect, it } from 'vitest';

import {
  STAFF_SWIMLANE_ASSIGNEE_PREFIX,
  convertTeamMemberToDeveloper,
  convertTeamMembersToDevelopers,
  mergeTeamMembersWithAssignees,
  shouldSyncAssigneeIdToTracker,
} from './teamMemberUtils';

function baseMember(over: Partial<TeamMember> = {}): TeamMember {
  return {
    active: true,
    displayName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    login: 'test',
    team: {
      uid: 'team-1',
      slug: 'alpha',
      title: 'Alpha',
      queue: 'Q',
      board: 1,
    },
    tracker_uid: null,
    uid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ...over,
  };
}

describe('convertTeamMemberToDeveloper', () => {
  it('использует tracker_uid как id, если он задан', () => {
    const dev = convertTeamMemberToDeveloper(
      baseMember({ tracker_uid: '  999001  ', displayName: 'Иван' })
    );
    expect(dev).toEqual(
      expect.objectContaining({
        id: '999001',
        name: 'Иван',
      })
    );
  });

  it('без tracker_uid даёт id staff:<staff_id> для свимлейна', () => {
    const uid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const dev = convertTeamMemberToDeveloper(
      baseMember({ tracker_uid: null, uid, displayName: 'Продукт' })
    );
    expect(dev).toEqual(
      expect.objectContaining({
        id: `${STAFF_SWIMLANE_ASSIGNEE_PREFIX}${uid}`,
        name: 'Продукт',
      })
    );
  });

  it('пустое имя — fallback на email, затем login, затем id', () => {
    const uid = 'u1';
    const id = `${STAFF_SWIMLANE_ASSIGNEE_PREFIX}${uid}`;
    expect(
      convertTeamMemberToDeveloper(
        baseMember({
          uid,
          displayName: '   ',
          email: 'a@b.c',
          tracker_uid: null,
        })
      )?.name
    ).toBe('a@b.c');
    expect(
      convertTeamMemberToDeveloper(
        baseMember({
          uid,
          displayName: '',
          email: null,
          login: 'log',
          tracker_uid: null,
        })
      )?.name
    ).toBe('log');
    expect(
      convertTeamMemberToDeveloper(
        baseMember({
          uid,
          displayName: '',
          email: undefined,
          login: '',
          tracker_uid: null,
        })
      )?.name
    ).toBe(id);
  });

  it('без uid возвращает null', () => {
    expect(convertTeamMemberToDeveloper(baseMember({ uid: '' }))).toBeNull();
    expect(convertTeamMemberToDeveloper(baseMember({ uid: '   ' }))).toBeNull();
  });
});

describe('mergeTeamMembersWithAssignees', () => {
  it('объединяет участника без трекера и исполнителя из спринта', () => {
    const uid = 'staff-only-uuid';
    const teamMembers = [
      baseMember({ uid, tracker_uid: null, displayName: 'Локальный' }),
    ];
    const sprintAssignees: Developer[] = [
      {
        id: 'tracker-77',
        name: 'Из трекера',
        role: 'developer',
      },
    ];
    const merged = mergeTeamMembersWithAssignees(teamMembers, sprintAssignees);
    expect(merged.map((d) => d.id).sort()).toEqual(
      [`${STAFF_SWIMLANE_ASSIGNEE_PREFIX}${uid}`, 'tracker-77'].sort()
    );
  });
});

describe('shouldSyncAssigneeIdToTracker', () => {
  it('false для локального staff id', () => {
    expect(shouldSyncAssigneeIdToTracker('staff:uuid')).toBe(false);
  });

  it('false для общей строки свимлейна', () => {
    expect(shouldSyncAssigneeIdToTracker('__team__')).toBe(false);
  });

  it('true для id из Трекера', () => {
    expect(shouldSyncAssigneeIdToTracker('123456')).toBe(true);
  });
});

describe('convertTeamMembersToDevelopers', () => {
  it('не отбрасывает участников только с staff id', () => {
    const list = convertTeamMembersToDevelopers([
      baseMember({ uid: 's1', tracker_uid: null }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(`${STAFF_SWIMLANE_ASSIGNEE_PREFIX}s1`);
  });
});
