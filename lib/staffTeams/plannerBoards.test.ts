import { describe, expect, it } from 'vitest';

import { mapTeamsToPlannerBoards } from './plannerBoards';

describe('mapTeamsToPlannerBoards', () => {
  it('maps teams with numeric board ids to planner boards', () => {
    expect(
      mapTeamsToPlannerBoards([
        {
          slug: 'team-core',
          title: 'Core',
          tracker_board_id: '377',
          tracker_queue_key: 'POG',
        },
        {
          slug: 'team-mobile',
          title: 'Mobile',
          tracker_board_id: '478',
          tracker_queue_key: 'MOBILE',
        },
      ])
    ).toEqual([
      { id: 377, name: 'Core', queue: 'POG', team: 'team-core', teamTitle: 'Core' },
      { id: 478, name: 'Mobile', queue: 'MOBILE', team: 'team-mobile', teamTitle: 'Mobile' },
    ]);
  });

  it('skips teams without a finite tracker board id', () => {
    expect(
      mapTeamsToPlannerBoards([
        {
          slug: 'no-board',
          title: 'Orphans',
          tracker_board_id: '',
          tracker_queue_key: 'X',
        },
        {
          slug: 'ok',
          title: 'Ok',
          tracker_board_id: '12',
          tracker_queue_key: 'OK',
        },
      ])
    ).toEqual([{ id: 12, name: 'Ok', queue: 'OK', team: 'ok', teamTitle: 'Ok' }]);
  });
});
