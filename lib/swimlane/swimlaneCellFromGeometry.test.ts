import { describe, expect, it } from 'vitest';

import { calculateCellFromCardLeft, calculateCellFromElement, calculateCellFromMouse } from './swimlaneCellFromGeometry';

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

  it('у правого края длинная карточка стартует так, чтобы целиком влезть в спринт', () => {
    // 10 дней × 3 части = 30 ячеек на 900px → 30px/ячейка; курсор у последнего пикселя.
    const swimlaneRect = domRect(0, 900);
    const r = calculateCellFromMouse(899, swimlaneRect, 3, undefined, 10);
    expect(r).toEqual({ day: 9, part: 0 });
  });

  it('курсор в зоне после спринта всё равно даёт maxStart по длительности', () => {
    const swimlaneRect = domRect(0, 900);
    const r = calculateCellFromMouse(1200, swimlaneRect, 2, undefined, 10);
    expect(r).toEqual({ day: 9, part: 1 });
  });
});

describe('calculateCellFromElement', () => {
  it('левый край карточки совпадает с левым краем свимлейна → day 0, part 0', () => {
    const swimlaneRect = domRect(100, 1000);
    const cardRect = domRect(100, 50);
    const r = calculateCellFromElement(cardRect, swimlaneRect, undefined);
    expect(r).toEqual({ day: 0, part: 0 });
  });

  it('снапает левый край к ближайшей линии сетки, а не к ячейке под ним', () => {
    // 30 ячеек на 900px → 30px/ячейка.
    const swimlaneRect = domRect(0, 900);
    expect(calculateCellFromElement(domRect(40, 60), swimlaneRect, undefined, 10)).toEqual({ day: 0, part: 1 });
    expect(calculateCellFromElement(domRect(50, 60), swimlaneRect, undefined, 10)).toEqual({ day: 0, part: 2 });
  });
});

describe('calculateCellFromCardLeft', () => {
  it('карточка чуть левее таймлайна стартует с day 0, part 0', () => {
    const r = calculateCellFromCardLeft(90, domRect(100, 900), 2, 10);
    expect(r).toEqual({ day: 0, part: 0 });
  });

  it('у правого края старт ограничен длительностью карточки', () => {
    const r = calculateCellFromCardLeft(880, domRect(0, 900), 3, 10);
    expect(r).toEqual({ day: 9, part: 0 });
  });

  it('старт берётся от левого края карточки, а не от курсора в её конце', () => {
    const swimlaneRect = domRect(0, 900);
    const cardLeft = 300;
    const fromCard = calculateCellFromCardLeft(cardLeft, swimlaneRect, 3, 10);
    const fromPointerAtCardEnd = calculateCellFromMouse(cardLeft + 85, swimlaneRect, 3, undefined, 10);
    expect(fromCard).toEqual({ day: 3, part: 1 });
    expect(fromPointerAtCardEnd).not.toEqual(fromCard);
  });
});
