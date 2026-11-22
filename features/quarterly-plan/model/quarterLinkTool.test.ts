import type { QuarterEditPort } from './quarterLinkTool';
import type { QuarterlyPlan, QuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { describe, expect, it, vi } from 'vitest';

import { buildQuarterWeeks } from '@/lib/quarterlyPlans/quarterWeeks';

import { QuarterLinkTool } from './quarterLinkTool';
import { QuarterPlanView } from './quarterPlanView';

const plan = {
  assignments: [
    { epicId: 'e1', id: 'a', memberId: 'ann', startWeek: 1, weeks: 1 },
    { epicId: 'e2', id: 'b', memberId: 'bob', startWeek: 3, weeks: 1 },
    { epicId: 'e2', id: 'c', memberId: 'bob', startWeek: 5, weeks: 1 },
  ],
  directions: [],
  epics: [],
  links: [{ fromId: 'a', id: 'l1', toId: 'c' }],
  notes: [],
  quarter: 4,
  sprintCards: {},
  teams: [],
  trackerEpics: {},
  year: 2026,
} as unknown as QuarterlyPlan;

function setup(confirmed = true) {
  let content = plan as QuarterlyPlanContent;
  const port: QuarterEditPort = {
    applyEdit: vi.fn((edit) => {
      content = edit(content);
    }),
    confirmLinkDelete: vi.fn(() => Promise.resolve(confirmed)),
    view: new QuarterPlanView({
      eventsByBoard: new Map(),
      hideDone: false,
      now: new Date('2026-10-16T12:00:00'),
      plan,
      planAfterDraft: plan,
      quarterView: false,
      weeks: buildQuarterWeeks({ quarter: 4, year: 2026 }),
    }),
  };
  return { links: () => content.links, port, tool: new QuarterLinkTool(() => port) };
}

describe('QuarterLinkTool', () => {
  it('источник, затем цель — связь от раньше стоящей полосы; инструмент остаётся включённым', () => {
    const { links, tool } = setup();
    tool.setArmed(true);
    tool.clickBar('b');
    expect(tool.sourceId).toBe('b');
    expect(tool.canLinkTo('a', plan.links)).toBe(true);
    tool.clickBar('a');
    expect(links().map(({ fromId, toId }) => [fromId, toId])).toEqual([['a', 'c'], ['a', 'b']]);
    expect([tool.armed, tool.sourceId]).toEqual([true, null]);
  });

  it('с уже связанной полосой связь не ставится — она становится источником; клик по источнику снимает выбор', () => {
    const { port, tool } = setup();
    tool.setArmed(true);
    tool.clickBar('a');
    expect(tool.canLinkTo('c', plan.links)).toBe(false);
    tool.clickBar('c');
    expect(port.applyEdit).not.toHaveBeenCalled();
    expect(tool.sourceId).toBe('c');
    tool.clickBar('c');
    expect(tool.sourceId).toBeNull();
  });

  it('связь из меню полосы — одна: после неё инструмент выключен; клик мимо её отменяет', () => {
    const { tool } = setup();
    tool.startFrom('a');
    tool.clickBar('b');
    expect(tool.armed).toBe(false);
    tool.startFrom('a');
    tool.clearSource();
    expect(tool.armed).toBe(false);
  });

  it('Escape снимает выбор, второй Escape выключает инструмент', () => {
    const { tool } = setup();
    tool.setArmed(true);
    tool.clickBar('a');
    tool.escape();
    expect([tool.armed, tool.sourceId]).toEqual([true, null]);
    tool.escape();
    expect(tool.armed).toBe(false);
  });

  it('удаление связи — только после подтверждения', async () => {
    const declined = setup(false);
    declined.tool.deleteLink('l1');
    await Promise.resolve();
    expect(declined.links()).toHaveLength(1);

    const accepted = setup(true);
    accepted.tool.deleteLink('l1');
    await vi.waitFor(() => expect(accepted.links()).toEqual([]));
  });
});
