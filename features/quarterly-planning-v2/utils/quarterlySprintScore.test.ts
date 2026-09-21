import type { SprintScoreRow } from '@/lib/api/types';

import { describe, expect, it } from 'vitest';

import { pickQuarterlySprintScoreEntry, sortSprintScoreRows } from './quarterlySprintScore';

function row(partial: Partial<SprintScoreRow>): SprintScoreRow {
  return {
    goals_done: 0,
    goals_percent: 0,
    goals_total: 0,
    mark: 0,
    mark_emoji: '🔴',
    mark_goals: 0,
    mark_sp: 0,
    mark_tp: 0,
    qa_done: 0,
    qa_left: 0,
    qa_total: 0,
    sname: 'S1',
    sp_done: 0,
    sp_done_percent: 0,
    sp_drop: 0,
    sp_left: 0,
    sp_total: 0,
    sprint_id: 1,
    team: '',
    tp_done_percent: 0,
    tp_drop: 0,
    ...partial,
  };
}

describe('quarterlySprintScore', () => {
  it('pickQuarterlySprintScoreEntry returns undefined for empty rows', () => {
    expect(pickQuarterlySprintScoreEntry([])).toBeUndefined();
  });

  it('uses highest mark row for header mark', () => {
    const entry = pickQuarterlySprintScoreEntry([
      row({ mark: 2, team: 'B' }),
      row({ mark: 5, team: 'A', mark_emoji: '🟢' }),
    ]);
    expect(entry?.mark).toBe(5);
    expect(entry?.markEmoji).toBe('🟢');
    expect(entry?.rows[0].team).toBe('A');
  });

  it('sortSprintScoreRows orders by mark desc then team name', () => {
    const sorted = sortSprintScoreRows([
      row({ mark: 1, team: 'z' }),
      row({ mark: 3, team: 'a' }),
      row({ mark: 3, team: 'm' }),
    ]);
    expect(sorted.map((r) => r.team)).toEqual(['a', 'm', 'z']);
  });
});
