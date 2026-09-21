import { describe, expect, it } from 'vitest';

import { uniqueQueueKeysFromTeams } from './fullOrgBoardScan';

describe('uniqueQueueKeysFromTeams', () => {
  it('dedupes queue keys and skips empty', () => {
    expect(
      uniqueQueueKeysFromTeams([
        {
          active: true,
          created_at: new Date(),
          id: 'a',
          organization_id: 'o',
          slug: 'a',
          title: 'A',
          tracker_board_id: '10',
          tracker_queue_key: 'ST',
          updated_at: new Date(),
        },
        {
          active: true,
          created_at: new Date(),
          id: 'b',
          organization_id: 'o',
          slug: 'b',
          title: 'B',
          tracker_board_id: '11',
          tracker_queue_key: 'BT',
          updated_at: new Date(),
        },
        {
          active: true,
          created_at: new Date(),
          id: 'c',
          organization_id: 'o',
          slug: 'c',
          title: 'C',
          tracker_board_id: '12',
          tracker_queue_key: 'ST',
          updated_at: new Date(),
        },
        {
          active: true,
          created_at: new Date(),
          id: 'd',
          organization_id: 'o',
          slug: 'd',
          title: 'D',
          tracker_board_id: '13',
          tracker_queue_key: '  ',
          updated_at: new Date(),
        },
      ])
    ).toEqual(['ST', 'BT']);
  });
});
