import type { AdminTrackerCatalogTeamBinding } from './adminTeamCatalog';

import { describe, expect, it } from 'vitest';

import { teamTitleUsingBoard, teamTitleUsingQueue } from './adminTeamCatalog';

const teams: AdminTrackerCatalogTeamBinding[] = [
  { id: '1', title: 'Alpha', tracker_board_id: '10', tracker_queue_key: 'ALPHA' },
  { id: '2', title: 'Beta', tracker_board_id: '20', tracker_queue_key: 'BETA' },
  { id: '3', title: 'Gamma', tracker_board_id: '0', tracker_queue_key: '' },
];

describe('teamTitleUsingQueue', () => {
  it('returns title for exact queue key match', () => {
    expect(teamTitleUsingQueue(teams, 'ALPHA')).toBe('Alpha');
  });

  it('trims whitespace from the query', () => {
    expect(teamTitleUsingQueue(teams, '  BETA  ')).toBe('Beta');
  });

  it('returns null when no team matches', () => {
    expect(teamTitleUsingQueue(teams, 'UNKNOWN')).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(teamTitleUsingQueue([], 'ALPHA')).toBeNull();
  });
});

describe('teamTitleUsingBoard', () => {
  it('returns title for exact board id match', () => {
    expect(teamTitleUsingBoard(teams, 10)).toBe('Alpha');
  });

  it('returns null when board id does not match', () => {
    expect(teamTitleUsingBoard(teams, 99)).toBeNull();
  });

  it('matches board id 0 when an entry has tracker_board_id "0"', () => {
    expect(teamTitleUsingBoard(teams, 0)).toBe('Gamma');
  });

  it('returns null for empty list', () => {
    expect(teamTitleUsingBoard([], 10)).toBeNull();
  });
});
