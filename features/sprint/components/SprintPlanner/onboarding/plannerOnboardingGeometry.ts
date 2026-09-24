export interface RectBox {
  height: number;
  left: number;
  top: number;
  width: number;
}

export type PlannerOnboardingCalloutSide = 'above' | 'below' | 'left' | 'right';

const VIEWPORT_GAP_PX = 16;

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
