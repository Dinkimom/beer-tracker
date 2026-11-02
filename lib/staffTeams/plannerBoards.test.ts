import { describe, expect, it } from 'vitest';

import { mapTeamsToPlannerBoards } from './plannerBoards';

describe('mapTeamsToPlannerBoards', () => {
  it('maps teams with numeric board ids to planner boards', () => {
    expect(
      mapTeamsToPlannerBoards([
        {
          id: 'core-id',
          slug: 'team-core',
          title: 'Core',
          tracker_board_id: '377',
          tracker_queue_key: 'POG',
        },
        {
          id: 'mobile-id',
          slug: 'team-mobile',
          title: 'Mobile',
          tracker_board_id: '478',
          tracker_queue_key: 'MOBILE',
        },
      ], new Set())
    ).toEqual([
      { id: 377, isMyTeam: false, name: 'Core', queue: 'POG', team: 'team-core', teamTitle: 'Core' },
      { id: 478, isMyTeam: false, name: 'Mobile', queue: 'MOBILE', team: 'team-mobile', teamTitle: 'Mobile' },
    ]);
  });

  it('skips teams without a finite tracker board id', () => {
    expect(
      mapTeamsToPlannerBoards([
        {
          id: 'no-board-id',
          slug: 'no-board',
          title: 'Orphans',
          tracker_board_id: '',
          tracker_queue_key: 'X',
        },
        {
          id: 'ok-id',
          slug: 'ok',
          title: 'Ok',
          tracker_board_id: '12',
          tracker_queue_key: 'OK',
        },
      ], new Set())
    ).toEqual([{ id: 12, isMyTeam: false, name: 'Ok', queue: 'OK', team: 'ok', teamTitle: 'Ok' }]);
  });

  it('lists every org team and puts the user\'s own teams first', () => {
    const boards = mapTeamsToPlannerBoards(
      [
        { id: 'a', slug: 'alpha', title: 'Alpha', tracker_board_id: '1', tracker_queue_key: 'A' },
        { id: 'b', slug: 'beta', title: 'Beta', tracker_board_id: '2', tracker_queue_key: 'B' },
        { id: 'c', slug: 'gamma', title: 'Gamma', tracker_board_id: '3', tracker_queue_key: 'C' },
      ],
      new Set(['b'])
    );
    expect(boards.map((b) => [b.team, b.isMyTeam])).toEqual([
      ['beta', true],
      ['alpha', false],
      ['gamma', false],
    ]);
  });
});
