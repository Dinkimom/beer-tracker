import type { Anchor } from '@/types';

export interface RectLike {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/** Якорь стрелки: сторона + сдвиг от середины. */
export interface XarrowAnchorSpec {
  offset: { x: number; y: number };
  position: Anchor;
}

interface ArrowAnchorPair {
  fromAnchor: XarrowAnchorSpec;
  toAnchor: XarrowAnchorSpec;
}

interface SidePair {
  from: Anchor;
  to: Anchor;
}

const SIDES: readonly Anchor[] = ['left', 'right', 'top', 'bottom'];
const ZERO_OFFSET = { x: 0, y: 0 } as const;

export const DEFAULT_NEAREST_SIDE_ANCHORS: ArrowAnchorPair = {
  fromAnchor: { position: 'right', offset: { ...ZERO_OFFSET } },
  toAnchor: { position: 'left', offset: { ...ZERO_OFFSET } },
};

function isXarrowAnchorSpec(anchor: Anchor | XarrowAnchorSpec): anchor is XarrowAnchorSpec {
  return typeof anchor !== 'string';
}

export function xarrowAnchorPosition(anchor: Anchor | XarrowAnchorSpec): Anchor {
  return isXarrowAnchorSpec(anchor) ? anchor.position : anchor;
}

export function xarrowAnchorOffset(anchor: Anchor | XarrowAnchorSpec): { x: number; y: number } {
  return isXarrowAnchorSpec(anchor) ? anchor.offset : { ...ZERO_OFFSET };
}

function toAnchorSpec(side: Anchor): XarrowAnchorSpec {
  return { position: side, offset: { ...ZERO_OFFSET } };
}

/** Середина выбранной стороны прямоугольника (якорь стрелки). */
export function anchorMidpoint(rect: RectLike, side: Anchor): { x: number; y: number } {
  const midX = (rect.left + rect.right) / 2;
  const midY = (rect.top + rect.bottom) / 2;
  switch (side) {
    case 'left':
      return { x: rect.left, y: midY };
    case 'right':
      return { x: rect.right, y: midY };
    case 'top':
      return { x: midX, y: rect.top };
    case 'bottom':
      return { x: midX, y: rect.bottom };
  }
}

function rectCenter(rect: RectLike): { x: number; y: number } {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
  };
}

function distanceSquared(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function sideOutwardNormal(side: Anchor): { x: number; y: number } {
  switch (side) {
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
  }
}

/** Сторона «смотрит наружу» на другой rect, если нормаль и вектор к его центру сонаправлены. */
function sideFacesRect(side: Anchor, rect: RectLike, otherRect: RectLike): boolean {
  const anchorPoint = anchorMidpoint(rect, side);
  const targetCenter = rectCenter(otherRect);
  const normal = sideOutwardNormal(side);
  const vx = targetCenter.x - anchorPoint.x;
  const vy = targetCenter.y - anchorPoint.y;
  return vx * normal.x + vy * normal.y > 0;
}

function resolveDominantAxisFallback(fromRect: RectLike, toRect: RectLike): SidePair {
  const fromCenter = rectCenter(fromRect);
  const toCenter = rectCenter(toRect);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const horizontalPrimary = Math.abs(dx) >= Math.abs(dy);

  if (horizontalPrimary) {
    return dx >= 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' };
  }
  return dy >= 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' };
}

function isValidSidePair(
  fromRect: RectLike,
  toRect: RectLike,
  fromSide: Anchor,
  toSide: Anchor
): boolean {
  if (fromSide === toSide) return false;
  if (!sideFacesRect(fromSide, fromRect, toRect)) return false;
  return sideFacesRect(toSide, toRect, fromRect);
}

function listValidSidePairs(fromRect: RectLike, toRect: RectLike): SidePair[] {
  const pairs: SidePair[] = [];
  for (const from of SIDES) {
    for (const to of SIDES) {
      if (isValidSidePair(fromRect, toRect, from, to)) {
        pairs.push({ from, to });
      }
    }
  }
  return pairs;
}

function pickNearestSidePair(fromRect: RectLike, toRect: RectLike): SidePair | null {
  const pairs = listValidSidePairs(fromRect, toRect);
  if (pairs.length === 0) return null;

  let best = pairs[0];
  let bestScore = distanceSquared(
    anchorMidpoint(fromRect, best.from),
    anchorMidpoint(toRect, best.to)
  );

  for (let i = 1; i < pairs.length; i += 1) {
    const pair = pairs[i];
    const score = distanceSquared(
      anchorMidpoint(fromRect, pair.from),
      anchorMidpoint(toRect, pair.to)
    );
    if (score < bestScore) {
      best = pair;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Пара ближайших сторон двух прямоугольников для стрелки.
 * Среди сторон, смотрящих друг на друга, берёт пару с минимальным
 * расстоянием между серединами (из ближайшей стороны к ближайшей).
 */
export function resolveNearestSideAnchors(fromRect: RectLike, toRect: RectLike): ArrowAnchorPair {
  const best =
    pickNearestSidePair(fromRect, toRect) ?? resolveDominantAxisFallback(fromRect, toRect);

  return {
    fromAnchor: toAnchorSpec(best.from),
    toAnchor: toAnchorSpec(best.to),
  };
}
