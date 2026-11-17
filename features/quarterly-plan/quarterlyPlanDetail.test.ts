import { describe, expect, it } from 'vitest';

import { parseQuarterDetailLevel, rollupBarId, rollupLinkEnds, rollupLinks, rollupPhases } from './quarterlyPlanDetail';

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

describe('связи на роадмэпе (QL7)', () => {
  const epic = (id: string, parentEpicId?: string) => ({
    directionId: 'd1',
    id,
    ...(parentEpicId ? { parentEpicId } : {}),
    status: 'backlog' as const,
    title: id,
  });
  const onEpic = (id: string, epicId: string, startWeek: number, weeks: number, phase?: 'discovery') => ({
    ...bar(id, startWeek, weeks, phase),
    epicId,
  });
  const plan = {
    assignments: [
      onEpic('a1', 'e1', 0, 2),
      onEpic('a2', 'e1-task', 2, 2),
      onEpic('a0', 'e1', 0, 1, 'discovery'),
      onEpic('b1', 'e2', 5, 1),
      onEpic('b2', 'e2', 6, 2),
      { directionId: 'd1', id: 'c1', memberId: 'dev', startWeek: 1, weeks: 1 },
    ],
    epics: [epic('e1'), epic('e1-task', 'e1'), epic('e2')],
    links: [
      { fromId: 'a1', id: 'l1', toId: 'b1' },
      { fromId: 'a2', id: 'l2', toId: 'b2' },
      { fromId: 'a1', id: 'l3', toId: 'a2' },
      { fromId: 'a0', id: 'l4', toId: 'a1' },
    ],
  };
  const delivery = (rowId: string) => rollupBarId(rowId, 'delivery');

  it('связи назначений сводятся в связи сводных полос: пара полос — одна стрелка, внутри полосы — ничего', () => {
    expect(rollupLinks(plan)).toEqual([
      { fromId: delivery('e1'), id: 'l1', linkIds: ['l1', 'l2'], toId: delivery('e2') },
      { fromId: rollupBarId('e1', 'discovery'), id: 'l4', linkIds: ['l4'], toId: delivery('e1') },
    ]);
  });

  it('новая связь ложится от последнего назначения блокирующей полосы к первому назначению зависимой', () => {
    expect(rollupLinkEnds(plan, delivery('e1'), delivery('e2'))).toEqual({ fromId: 'a2', toId: 'b1' });
    // Выбрали в обратном порядке — блокирует всё равно та, что стоит раньше.
    expect(rollupLinkEnds(plan, delivery('e2'), delivery('e1'))).toEqual({ fromId: 'a2', toId: 'b1' });
  });

  it('сроки пересекаются — блокирует полоса, выбранная первой; пустая полоса связи не даёт', () => {
    expect(rollupLinkEnds(plan, delivery('d1'), delivery('e1'))).toEqual({ fromId: 'c1', toId: 'a1' });
    expect(rollupLinkEnds(plan, delivery('e1'), delivery('d1'))).toEqual({ fromId: 'a2', toId: 'c1' });
    expect(rollupLinkEnds(plan, delivery('e1'), delivery('nope'))).toBeNull();
  });
});
