import type { QuarterlyPlanAssignment, QuarterlyPlanContent, QuarterlyPlanEpic, QuarterlyPlanNote } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { mergeQuarterlyPlanContent } from './quarterlyPlanMerge';

const direction = (id: string) => ({ id, teamId: 'team', title: id });
const epic = (id: string, directionId = 'd1', extra: Partial<QuarterlyPlanEpic> = {}): QuarterlyPlanEpic => ({
  directionId,
  id,
  status: 'backlog',
  title: id,
  ...extra,
});
const bar = (id: string, epicId = 'e1', startWeek = 0): QuarterlyPlanAssignment => ({
  epicId,
  id,
  memberId: 'm1',
  startWeek,
  weeks: 1,
});
const note = (id: string, row: QuarterlyPlanNote['row']): QuarterlyPlanNote => ({
  color: 'yellow',
  id,
  row,
  rows: 1,
  startWeek: 0,
  text: id,
  weeks: 1,
});

const plan = (patch: Partial<QuarterlyPlanContent> = {}): QuarterlyPlanContent => ({
  assignments: [bar('a1'), bar('a2')],
  directions: [direction('d1')],
  epics: [epic('e1'), epic('e2')],
  links: [],
  notes: [],
  ...patch,
});
const ids = (items: ReadonlyArray<{ id: string }>) => items.map((item) => item.id);

describe('mergeQuarterlyPlanContent', () => {
  it('keeps edits of both people when they touched different entities', () => {
    const base = plan();
    const local = plan({ assignments: [bar('a1', 'e1', 3), bar('a2')] });
    const remote = plan({ assignments: [bar('a1'), bar('a2', 'e2', 5)], epics: [epic('e1'), epic('e2'), epic('e3')] });

    const merged = mergeQuarterlyPlanContent(base, local, remote);

    expect(merged.assignments).toEqual([bar('a1', 'e1', 3), bar('a2', 'e2', 5)]);
    expect(ids(merged.epics)).toEqual(['e1', 'e2', 'e3']);
  });

  it('prefers the own edit when both changed the same entity', () => {
    const merged = mergeQuarterlyPlanContent(
      plan(),
      plan({ assignments: [bar('a1', 'e1', 3), bar('a2')] }),
      plan({ assignments: [bar('a1', 'e1', 7), bar('a2')] })
    );
    expect(merged.assignments[0]).toEqual(bar('a1', 'e1', 3));
  });

  it('does not bring back what either side removed', () => {
    const merged = mergeQuarterlyPlanContent(
      plan(),
      plan({ assignments: [bar('a2')] }),
      plan({ assignments: [bar('a1', 'e1', 4)], epics: [epic('e1')] })
    );
    expect(ids(merged.assignments)).toEqual([]);
    expect(ids(merged.epics)).toEqual(['e1']);
  });

  it('puts own new rows after the same neighbour, in the order of the other side', () => {
    const merged = mergeQuarterlyPlanContent(
      plan(),
      plan({ epics: [epic('e1'), epic('mine'), epic('e2')] }),
      plan({ epics: [epic('theirs'), epic('e1'), epic('e2')] })
    );
    expect(ids(merged.epics)).toEqual(['theirs', 'e1', 'mine', 'e2']);
  });

  it('drops own entities that pointed at something the other side removed', () => {
    const base = plan({ epics: [epic('e1'), epic('e2'), epic('task', 'd1', { parentEpicId: 'e2' })] });
    const local: QuarterlyPlanContent = {
      ...base,
      assignments: [bar('a1'), bar('a2'), bar('mine', 'e2')],
      links: [{ fromId: 'a1', id: 'l1', toId: 'mine' }],
      notes: [note('n-epic', { id: 'e2', kind: 'epic' }), note('n-team', { id: 'team', kind: 'team' })],
    };
    const remote = plan({ epics: [epic('e1')] });

    const merged = mergeQuarterlyPlanContent(base, local, remote);

    expect(ids(merged.epics)).toEqual(['e1']);
    expect(ids(merged.assignments)).toEqual(['a1', 'a2']);
    expect(merged.links).toEqual([]);
    expect(ids(merged.notes)).toEqual(['n-team']);
  });

  it('keeps one link when both linked the same pair', () => {
    const merged = mergeQuarterlyPlanContent(
      plan(),
      plan({ links: [{ fromId: 'a1', id: 'mine', toId: 'a2' }] }),
      plan({ links: [{ fromId: 'a2', id: 'theirs', toId: 'a1' }] })
    );
    expect(merged.links).toHaveLength(1);
  });
});
