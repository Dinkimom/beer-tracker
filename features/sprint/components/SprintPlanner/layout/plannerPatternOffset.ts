export interface PlannerPatternOffsetNode {
  offsetLeft: number;
  offsetParent: PlannerPatternOffsetNode | null;
  offsetTop: number;
}

/**
 * Сдвиг элемента относительно общего листа узора.
 * Если цепочка offsetParent не доходит до origin, сдвиг нулевой —
 * узор остаётся привязанным к своему блоку.
 */
export function plannerPatternOffsetWithin(
  node: PlannerPatternOffsetNode,
  origin: PlannerPatternOffsetNode
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: PlannerPatternOffsetNode | null = node;
  const seen = new Set<PlannerPatternOffsetNode>();
  while (current && current !== origin) {
    if (seen.has(current)) {
      return { x: 0, y: 0 };
    }
    seen.add(current);
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent;
  }
  if (current !== origin) {
    return { x: 0, y: 0 };
  }
  return { x: Math.round(x), y: Math.round(y) };
}
