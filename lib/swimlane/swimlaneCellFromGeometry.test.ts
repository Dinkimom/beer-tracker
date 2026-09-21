import { describe, expect, it } from 'vitest';

import { calculateCellFromElement, calculateCellFromMouse } from './swimlaneCellFromGeometry';

function domRect(left: number, width: number): DOMRect {
  return {
    bottom: 0,
    height: 0,
    left,
    right: left + width,
    toJSON: () => '',
    top: 0,
    width,
    x: left,
    y: 0,
  } as DOMRect;
}

describe('calculateCellFromMouse', () => {
  it('левый край таймлайна → day 0, part 0', () => {
    const swimlaneRect = domRect(100, 1000);
    const r = calculateCellFromMouse(100, swimlaneRect, 1, undefined);
    expect(r).toEqual({ day: 0, part: 0 });
  });

  it('внутри первой ячейки 6-го рабочего дня (30 ячеек на 1000px) → day 5, part 0', () => {
    const swimlaneRect = domRect(0, 1000);
    const r = calculateCellFromMouse(510, swimlaneRect, 1, undefined);
    expect(r).toEqual({ day: 5, part: 0 });
  });

  it('swimlaneElement игнорируется — сетка линейная по полной ширине', () => {
    const swimlaneRect = domRect(0, 1000);
    const r = calculateCellFromMouse(510, swimlaneRect, 1, {} as HTMLElement);
    expect(r).toEqual({ day: 5, part: 0 });
  });

  it('параметр длительности задачи не ломает расчёт (API-совместимость)', () => {
    const swimlaneRect = domRect(0, 1000);
    const a = calculateCellFromMouse(100, swimlaneRect, 1, undefined);
    const b = calculateCellFromMouse(100, swimlaneRect, 99, undefined);
    expect(a).toEqual(b);
  });
});

describe('calculateCellFromElement', () => {
  it('левый край карточки совпадает с левым краем свимлейна → day 0, part 0', () => {
    const swimlaneRect = domRect(100, 1000);
    const cardRect = domRect(100, 50);
    const r = calculateCellFromElement(cardRect, swimlaneRect, undefined);
    expect(r).toEqual({ day: 0, part: 0 });
  });

  it('совпадает с мышью при тех же относительных координатах', () => {
    const swimlaneRect = domRect(100, 1000);
    const mouseX = 250;
    const cardRect = domRect(mouseX, 40);
    const fromMouse = calculateCellFromMouse(mouseX, swimlaneRect, 1, undefined);
    const fromEl = calculateCellFromElement(cardRect, swimlaneRect, undefined);
    expect(fromEl).toEqual(fromMouse);
  });
});
