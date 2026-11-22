import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuarterBoardMenu } from './quarterBoardMenu';

const at = { x: 10, y: 20 };
const epicRow = { id: 'e1', kind: 'epic' as const };

describe('QuarterBoardMenu', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('меню назначения показывает превью полосы на свободных днях недели; у направления фаза — discovery', () => {
    const menu = new QuarterBoardMenu();
    menu.openAssign(epicRow, 2, at, { days: 3, startDay: 12 });
    expect(menu.assignPreview).toEqual({ closing: false, phase: 'delivery', row: epicRow, startWeek: 2.4, weeks: 0.6 });
    menu.openAssign({ id: 'd1', kind: 'direction' }, 1, at, { days: 5, startDay: 5 });
    expect(menu.assignPreview?.phase).toBe('discovery');
  });

  it('закрыли мимо — меню и превью гаснут, потом уходят', () => {
    const menu = new QuarterBoardMenu();
    menu.openAssign(epicRow, 2, at, { days: 5, startDay: 10 });
    menu.close();
    expect(menu.current).toBeNull();
    expect(menu.shown?.kind).toBe('assign');
    expect(menu.assignPreview?.closing).toBe(true);
    vi.advanceTimersByTime(200);
    expect(menu.shown).toBeNull();
    expect(menu.assignPreview).toBeNull();
  });

  it('выбрали пункт — превью уходит сразу, меню ещё гаснет', () => {
    const menu = new QuarterBoardMenu();
    menu.openAssign(epicRow, 2, at, { days: 5, startDay: 10 });
    menu.close('select');
    expect(menu.assignPreview).toBeNull();
    expect(menu.shown).not.toBeNull();
  });

  it('новое меню во время ухода старого не пропадает по его таймеру', () => {
    const menu = new QuarterBoardMenu();
    menu.openBar('a1', at);
    menu.close();
    menu.openStatus('e1', at);
    vi.advanceTimersByTime(500);
    expect(menu.shown).toEqual({ anchor: at, epicId: 'e1', kind: 'status' });
  });

  it('«Добавить человека» из меню полосы: выбор на те же дни, строку и фазу; фаза меняется без закрытия', () => {
    const menu = new QuarterBoardMenu();
    menu.openBar('a1', at);
    menu.assignMore({ epicId: 'e1', id: 'a1', memberId: 'ann', phase: 'discovery', startWeek: 3, weeks: 2 });
    expect(menu.current).toMatchObject({ anchor: at, kind: 'assign', phase: 'discovery', row: epicRow, week: 3, weeks: 2 });
    menu.setAssignPhase('delivery');
    expect(menu.assignPreview?.phase).toBe('delivery');
  });
});
