import type { QuarterEditPort } from './quarterLinkTool';
import type { QuarterlyPlan, QuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { describe, expect, it, vi } from 'vitest';

import { buildQuarterWeeks } from '@/lib/quarterlyPlans/quarterWeeks';

import { QuarterNoteTool } from './quarterNoteTool';
import { QuarterPlanView } from './quarterPlanView';

const row = { id: 'e1', kind: 'epic' as const };
const plan = {
  assignments: [],
  directions: [],
  epics: [],
  links: [],
  notes: [{ color: 'yellow', id: 'n1', row, rows: 1, startWeek: 1, text: 'Old', weeks: 2 }],
  quarter: 4,
  sprintCards: {},
  teams: [],
  trackerEpics: {},
  year: 2026,
} as unknown as QuarterlyPlan;

function setup() {
  let content = plan as QuarterlyPlanContent;
  const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });
  const port: QuarterEditPort = {
    applyEdit: vi.fn((edit) => {
      content = edit(content);
    }),
    confirmLinkDelete: () => Promise.resolve(true),
    view: new QuarterPlanView({
      eventsByBoard: new Map(),
      hideDone: false,
      now: new Date('2026-10-16T12:00:00'),
      plan,
      planAfterDraft: plan,
      quarterView: false,
      weeks,
    }),
  };
  return { notes: () => content.notes, port, tool: new QuarterNoteTool(() => port), weeks };
}

describe('QuarterNoteTool', () => {
  it('инструмент ставит лист-черновик цветом инструмента и отпускается; в план — только с текстом', () => {
    const { notes, port, tool } = setup();
    tool.setActive(true);
    tool.setColor('pink');
    tool.place(row, 3);
    expect(tool.active).toBe(false);
    expect(tool.draftNote).toMatchObject({ color: 'pink', row, startWeek: 3, text: '' });

    tool.submit('   ');
    expect(port.applyEdit).not.toHaveBeenCalled();
    expect(tool.draftNote).toBeNull();

    tool.place(row, 3);
    tool.submit(' Freeze ');
    expect(notes().map((note) => [note.text, note.color])).toEqual([
      ['Old', 'yellow'],
      ['Freeze', 'pink'],
    ]);
  });

  it('лист у конца квартала не выходит за последнюю неделю', () => {
    const { tool, weeks } = setup();
    tool.place(row, weeks.length - 1);
    expect(tool.draftNote?.weeks).toBe(1);
  });

  it('правка готовой заметки: текст с её; развернули в фокус и вернули — набранное сохраняется; цвет меняется', () => {
    const { notes, tool } = setup();
    tool.open('n1');
    expect(tool.editing).toEqual({ color: 'yellow', expanded: false, noteId: 'n1', value: 'Old' });
    tool.expand('Old, edited');
    tool.setFocusValue('Old, edited twice');
    tool.collapse();
    expect(tool.editing).toMatchObject({ expanded: false, value: 'Old, edited twice' });
    tool.setColor('blue');
    tool.submit('New');
    expect(notes()[0]).toMatchObject({ color: 'blue', text: 'New' });
  });

  it('жест обновляется только при смене недели, строки или размера', () => {
    const { tool } = setup();
    const drag = { mode: 'move' as const, note: plan.notes[0], row };
    tool.setDrag(drag);
    tool.setDrag({ ...drag, note: { ...drag.note } });
    expect(tool.drag).toBe(drag);
    tool.setDrag({ ...drag, note: { ...drag.note, startWeek: 4 } });
    expect(tool.drag?.note.startWeek).toBe(4);
  });
});
