export interface RectBox {
  height: number;
  left: number;
  top: number;
  width: number;
}

export type PlannerOnboardingCalloutSide = 'above' | 'below' | 'left' | 'right';

const VIEWPORT_GAP_PX = 16;

interface OnboardingDayHeader {
  index: number;
  rect: RectBox;
}

/** Сегодня, если этот день есть в спринте. Иначе первый день. */
export function pickOnboardingSprintDayIndex(
  dayIndexes: readonly number[],
  todayIndex: number | null
): number | null {
  if (todayIndex != null && dayIndexes.includes(todayIndex)) {
    return todayIndex;
  }
  if (dayIndexes.includes(0)) {
    return 0;
  }
  if (dayIndexes.length === 0) {
    return null;
  }
  return Math.min(...dayIndexes);
}

/** Обводка держится на ширине карточки в полный день, пока сама карточка анимирует ширину. */
export function onboardingSampleCardOutline(
  card: RectBox,
  dayColumn: RectBox | null,
  marginPx: number
): RectBox {
  if (dayColumn == null) {
    return card;
  }
  return {
    height: card.height,
    left: card.left,
    top: card.top,
    width: Math.max(1, dayColumn.width - marginPx * 2),
  };
}

/** Обводка карточки остаётся на ширине целого дня, даже когда карточка выросла на часть. */
export function onboardingSampleOutlineRect(
  rect: RectBox,
  grown: boolean,
  partsPerDay: number
): RectBox {
  if (!grown || partsPerDay < 1) {
    return rect;
  }
  return { ...rect, width: (rect.width * partsPerDay) / (partsPerDay + 1) };
}

/** Колонка одного дня: от ячейки шапки до низа видимой доски. */
export function resolveOnboardingDayColumn(input: {
  boardBottom: number;
  days: readonly OnboardingDayHeader[];
  todayIndex: number | null;
}): { column: RectBox; dayIndex: number } | null {
  const days = input.days.filter((day) => day.rect.width > 8 && day.rect.height > 8);
  const dayIndex = pickOnboardingSprintDayIndex(
    days.map((day) => day.index),
    input.todayIndex
  );
  const day = days.find((item) => item.index === dayIndex);
  if (day == null) {
    return null;
  }
  return {
    column: {
      height: Math.max(day.rect.height, input.boardBottom - day.rect.top),
      left: day.rect.left,
      top: day.rect.top,
      width: day.rect.width,
    },
    dayIndex: day.index,
  };
}

export function sameRect(left: RectBox | null, right: RectBox | null): boolean {
  if (left == null || right == null) {
    return left === right;
  }
  return (
    left.top === right.top &&
    left.left === right.left &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function resolvePlannerOnboardingGhostRect(
  lane: RectBox,
  input: {
    cardHeightPx: number;
    insetPx: number;
    marginPx: number;
    slotCount: number;
  }
): RectBox | null {
  if (lane.width <= 0 || lane.height <= 0 || input.slotCount <= 0) {
    return null;
  }
  const slotWidth = lane.width / input.slotCount;
  const width = slotWidth - input.marginPx * 2;
  const height = Math.min(input.cardHeightPx, lane.height - input.insetPx * 2);
  if (width < 24 || height < 24) {
    return null;
  }
  return {
    height,
    left: lane.left + input.marginPx,
    top: lane.top + input.insetPx,
    width,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/** Общий прямоугольник двух зон: карточка и меню попадают в одну обводку. */
export function unionOnboardingRects(first: RectBox | null, second: RectBox | null): RectBox | null {
  if (first == null) {
    return second;
  }
  if (second == null) {
    return first;
  }
  const left = Math.min(first.left, second.left);
  const top = Math.min(first.top, second.top);
  const right = Math.max(first.left + first.width, second.left + second.width);
  const bottom = Math.max(first.top + first.height, second.top + second.height);
  return { height: bottom - top, left, top, width: right - left };
}

/** Подсказку ставим туда, где она не закрывает меню: справа, если там есть место, иначе слева. */
export function resolveOnboardingMenuCalloutSide(
  menu: RectBox | null,
  viewportWidth: number,
  calloutWidth: number
): 'left' | 'right' {
  if (menu == null) {
    return 'left';
  }
  const spaceRight = viewportWidth - menu.left - menu.width;
  return spaceRight >= calloutWidth + VIEWPORT_GAP_PX ? 'right' : 'left';
}

export function placePlannerOnboardingCallout(
  target: RectBox | null,
  side: PlannerOnboardingCalloutSide,
  viewport: { height: number; width: number },
  size: { height: number; width: number }
): { left: number; top: number } {
  const maxLeft = viewport.width - size.width - VIEWPORT_GAP_PX;
  const maxTop = viewport.height - size.height - VIEWPORT_GAP_PX;
  if (target == null) {
    return {
      left: clamp((viewport.width - size.width) / 2, VIEWPORT_GAP_PX, maxLeft),
      top: clamp(viewport.height - size.height - 24, VIEWPORT_GAP_PX, maxTop),
    };
  }
  const placed = resolveCalloutOrigin(target, side, size);
  return {
    left: clamp(placed.left, VIEWPORT_GAP_PX, maxLeft),
    top: clamp(placed.top, VIEWPORT_GAP_PX, maxTop),
  };
}

function resolveCalloutOrigin(
  target: RectBox,
  side: PlannerOnboardingCalloutSide,
  size: { height: number; width: number }
): { left: number; top: number } {
  const gap = 12;
  if (side === 'below') {
    return { left: target.left, top: target.top + target.height + gap };
  }
  if (side === 'above') {
    return {
      left: target.left + target.width / 2 - size.width / 2,
      top: target.top - size.height - gap,
    };
  }
  if (side === 'left') {
    return { left: target.left - size.width - gap, top: target.top };
  }
  return { left: target.left + target.width + gap, top: target.top };
}
