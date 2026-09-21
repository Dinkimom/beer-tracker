import { describe, expect, it } from 'vitest';

import {
  TEAM_SWIMLANE_ASSIGNEE_ID,
  createTeamSwimlaneDeveloper,
  isTeamSwimlaneAssigneeId,
  isTeamSwimlaneRowHidden,
  trackerAssigneeForCreatedIssue,
} from './teamSwimlaneAssignee';

describe('team swimlane assignee', () => {
  it('recognizes the shared-lane sentinel', () => {
    expect(isTeamSwimlaneAssigneeId(TEAM_SWIMLANE_ASSIGNEE_ID)).toBe(true);
    expect(isTeamSwimlaneAssigneeId('dev-1')).toBe(false);
    expect(isTeamSwimlaneAssigneeId(undefined)).toBe(false);
  });

  it('builds a synthetic developer for the shared lane', () => {
    expect(createTeamSwimlaneDeveloper('Team')).toEqual({
      id: TEAM_SWIMLANE_ASSIGNEE_ID,
      name: 'Team',
      role: 'other',
    });
  });

  it('tracks team row visibility in hidden ids', () => {
    expect(isTeamSwimlaneRowHidden(new Set())).toBe(false);
    expect(isTeamSwimlaneRowHidden(new Set([TEAM_SWIMLANE_ASSIGNEE_ID]))).toBe(true);
  });
});

describe('trackerAssigneeForCreatedIssue', () => {
  it('never sends the shared-lane sentinel to Tracker', () => {
    expect(trackerAssigneeForCreatedIssue(TEAM_SWIMLANE_ASSIGNEE_ID)).toBeUndefined();
    expect(trackerAssigneeForCreatedIssue(TEAM_SWIMLANE_ASSIGNEE_ID, TEAM_SWIMLANE_ASSIGNEE_ID)).toBe(
      undefined
    );
  });

  it('prefers the person chosen in the picker', () => {
    expect(trackerAssigneeForCreatedIssue(TEAM_SWIMLANE_ASSIGNEE_ID, 'dev-1')).toBe('dev-1');
    expect(trackerAssigneeForCreatedIssue('dev-2', 'dev-1')).toBe('dev-1');
  });

  it('keeps a real row assignee when nobody is selected', () => {
    expect(trackerAssigneeForCreatedIssue('dev-2')).toBe('dev-2');
  });
});
