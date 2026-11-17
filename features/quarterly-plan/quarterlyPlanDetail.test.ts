import { describe, expect, it } from 'vitest';

import { parseQuarterDetailLevel, rollupPhases } from './quarterlyPlanDetail';

const bar = (id: string, startWeek: number, weeks: number, phase?: 'discovery', memberId = 'dev') => ({
  epicId: 'e1',
  id,
  memberId,
  ...(phase ? { phase } : {}),
  startWeek,
  weeks,
});

describe('rollupPhases (QZ3)', () => {
  it('одна полоса на фазу: от самого раннего начала до самого позднего конца', () => {
    const { laneCount, rollups } = rollupPhases([bar('a', 2, 2), bar('b', 5, 1), bar('c', 0, 1, 'discovery')]);
    expect(rollups).toEqual([
      { days: 5, lane: 0, memberIds: ['dev'], phase: 'discovery', startDay: 0 },
      { days: 20, lane: 0, memberIds: ['dev'], phase: 'delivery', startDay: 10 },
    ]);
    expect(laneCount).toBe(1);
  });

  it('проработка и поставка пересекаются — две дорожки; полос нет — пусто', () => {
    const { laneCount, rollups } = rollupPhases([bar('a', 1, 3), bar('b', 0, 2, 'discovery')]);
    expect(rollups.map((rollup) => [rollup.phase, rollup.lane])).toEqual([
      ['discovery', 0],
      ['delivery', 1],
    ]);
    expect(laneCount).toBe(2);
    expect(rollupPhases([]).rollups).toEqual([]);
  });

  it('люди фазы — без повторов, в порядке начала их полос', () => {
    const { rollups } = rollupPhases([bar('a', 3, 1, undefined, 'bob'), bar('b', 1, 1, undefined, 'ann'), bar('c', 5, 1, undefined, 'bob')]);
    expect(rollups[0]?.memberIds).toEqual(['ann', 'bob']);
  });

  it('срок округляется до целых недель, даже если полоса задевает неделю одним днём', () => {
    // Дни 6–10: со вторника второй недели по понедельник третьей — на роадмэпе это недели 2 и 3 целиком.
    const day = { ...bar('a', 1, 2), days: 5, startDay: 6 };
    expect(rollupPhases([day]).rollups).toEqual([{ days: 10, lane: 0, memberIds: ['dev'], phase: 'delivery', startDay: 5 }]);
  });
});

describe('parseQuarterDetailLevel', () => {
  it('незнакомое значение — план', () => {
    expect(parseQuarterDetailLevel('roadmap')).toBe('roadmap');
    expect(parseQuarterDetailLevel('zoom')).toBe('plan');
  });
});
