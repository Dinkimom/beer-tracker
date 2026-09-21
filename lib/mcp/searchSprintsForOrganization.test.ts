import type { McpSprintSearchHit } from './searchSprintsForOrganization';

import { describe, expect, it } from 'vitest';

import {
  dedupeSprintSearchHits,
  matchesSprintQuery,
  rankSprintSearchHits,
} from './searchSprintsForOrganization';

describe('matchesSprintQuery', () => {
  it('matches case-insensitive substrings', () => {
    expect(matchesSprintQuery('RND Team 1 Sprint 31', 'sprint 31')).toBe(true);
    expect(matchesSprintQuery('RND Team 1 Sprint 31', 'TEAM 1')).toBe(true);
    expect(matchesSprintQuery('RND Team 1 Sprint 31', '42')).toBe(false);
  });

  it('treats empty query as match-all', () => {
    expect(matchesSprintQuery('Anything', '  ')).toBe(true);
  });
});

describe('rankSprintSearchHits', () => {
  const base = (partial: Partial<McpSprintSearchHit> & Pick<McpSprintSearchHit, 'name' | 'sprintId'>): McpSprintSearchHit => ({
    boardId: 1,
    endDate: '2026-09-21',
    startDate: '2026-09-07',
    status: 'draft',
    ...partial,
  });

  it('prefers exact and prefix matches, then active status', () => {
    const ranked = rankSprintSearchHits(
      [
        base({ name: 'Legacy Sprint 31 archive', sprintId: 1, status: 'draft', startDate: '2026-01-01' }),
        base({ name: 'Sprint 31', sprintId: 2, status: 'in_progress', startDate: '2026-09-07' }),
        base({
          name: 'RND Team 1 Sprint 31',
          sprintId: 3,
          status: 'in_progress',
          startDate: '2026-10-01',
        }),
      ],
      'Sprint 31'
    );
    expect(ranked.map((h) => h.sprintId)).toEqual([2, 3, 1]);
  });

  it('dedupes the same sprintId across boards preferring dated Team match', () => {
    const { collapsedDuplicates, hits } = dedupeSprintSearchHits(
      [
        {
          boardId: 147,
          boardName: 'AQA board',
          endDate: '',
          name: 'RND Team 1 Sprint 31',
          sprintId: 1152,
          startDate: '',
          status: 'in_progress',
        },
        {
          boardId: 113,
          boardName: 'Team 1',
          endDate: '2026-09-21',
          name: 'RND Team 1 Sprint 31',
          sprintId: 1152,
          startDate: '2026-09-07',
          status: 'in_progress',
        },
      ],
      'Team 1 Sprint 31'
    );
    expect(collapsedDuplicates).toBe(1);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.boardId).toBe(113);
  });
});
