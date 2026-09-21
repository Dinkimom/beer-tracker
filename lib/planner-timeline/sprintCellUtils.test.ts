import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import {
  dateTimeToFractionalCell,
  dateTimeToFractionalCellInRange,
  TOTAL_PARTS,
} from './sprintCellUtils';

/** Пн 10 марта 2025 — первый день двухнедельного спринта (10 рабочих дней). */
const sprintStartMar2025 = new Date(2025, 2, 10);

describe('dateTimeToFractionalCellInRange', () => {
  it('в субботу не уезжает в конец диапазона: снап к пятнице 18:00 текущей недели', () => {
    const totalParts = 10 * PARTS_PER_DAY;
    const saturday = new Date(2025, 2, 15, 11, 0, 0);
    const cell = dateTimeToFractionalCellInRange(sprintStartMar2025, saturday, totalParts);
    // Пт 14 мар 18:00 → день 4, последняя треть дня
    expect(cell).toBe(4 * PARTS_PER_DAY + 2 + 1);
  });

  it('в воскресенье снап к предыдущей пятнице 18:00', () => {
    const totalParts = 10 * PARTS_PER_DAY;
    const sunday = new Date(2025, 2, 16, 9, 0, 0);
    const cell = dateTimeToFractionalCellInRange(sprintStartMar2025, sunday, totalParts);
    expect(cell).toBe(4 * PARTS_PER_DAY + 2 + 1);
  });

  it('будний день без изменений (дробная позиция в первом слоте)', () => {
    const totalParts = 10 * PARTS_PER_DAY;
    const monday = new Date(2025, 2, 10, 10, 0, 0);
    const cell = dateTimeToFractionalCellInRange(sprintStartMar2025, monday, totalParts);
    expect(cell).toBeCloseTo(1 / 3, 5);
  });
});

describe('dateTimeToFractionalCell', () => {
  it('суббота внутри спринта не даёт индекс после TOTAL_PARTS', () => {
    const saturday = new Date(2025, 2, 15, 11, 0, 0);
    const cell = dateTimeToFractionalCell(sprintStartMar2025, saturday);
    expect(cell).toBeLessThanOrEqual(TOTAL_PARTS);
    expect(cell).toBe(4 * PARTS_PER_DAY + 2 + 1);
  });
});
