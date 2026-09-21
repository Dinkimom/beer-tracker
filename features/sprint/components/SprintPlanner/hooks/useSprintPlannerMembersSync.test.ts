import { describe, expect, it } from 'vitest';

import { resolveTeamParticipantDisplayName } from './useSprintPlannerMembersSync';

describe('resolveTeamParticipantDisplayName', () => {
  const developers = [{ id: 'tracker-1', name: 'Ada Lovelace' }];

  it('prefers known display name from popup roster over planner list', () => {
    expect(
      resolveTeamParticipantDisplayName('staff-uuid-long', developers, '  Grace Hopper  ')
    ).toBe('Grace Hopper');
  });

  it('falls back to planner list when known name is missing', () => {
    expect(resolveTeamParticipantDisplayName('tracker-1', developers)).toBe('Ada Lovelace');
  });

  it('falls back to id when member is not in planner list yet', () => {
    expect(resolveTeamParticipantDisplayName('staff-uuid-long', developers, '  ')).toBe(
      'staff-uuid-long'
    );
  });
});
