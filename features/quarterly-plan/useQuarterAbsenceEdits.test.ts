import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it } from 'vitest';

import { rollbackAbsenceRemove, rollbackAbsenceUpdate } from './useQuarterAbsenceEdits';

function absence(id: string, startDate: string): BoardAvailabilityEvent {
  return { endDate: startDate, eventType: 'vacation', id, memberId: 'ann', memberName: 'Ann', startDate } as BoardAvailabilityEvent;
}

describe('откат правок отсутствий (QV4)', () => {
  it('неудавшаяся правка откатывается, только если поверх неё не легла более поздняя', () => {
    const original = absence('a1', '2026-10-01');
    const first = { ...original, startDate: '2026-10-02' };
    const second = { ...original, startDate: '2026-10-05' };
    expect(rollbackAbsenceUpdate([first], first, original)).toEqual([original]);
    expect(rollbackAbsenceUpdate([second], first, original)).toEqual([second]);
  });

  it('неудавшееся удаление возвращает отсутствие один раз', () => {
    const removed = absence('a1', '2026-10-01');
    expect(rollbackAbsenceRemove([], removed)).toEqual([removed]);
    expect(rollbackAbsenceRemove([removed], removed)).toEqual([removed]);
  });
});
