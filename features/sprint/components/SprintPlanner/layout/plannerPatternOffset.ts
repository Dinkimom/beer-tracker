export interface PlannerPatternOffsetNode {
  offsetLeft: number;
  /** `unknown`: у `HTMLElement` это `Element | null`, не наш интерфейс. */
  offsetParent: unknown;
  offsetTop: number;
}

function nextOffsetParent(node: PlannerPatternOffsetNode): PlannerPatternOffsetNode | null {
  const parent = node.offsetParent;
  if (!parent || typeof parent !== 'object') {
    return null;
  }
  if (!('offsetLeft' in parent) || !('offsetTop' in parent) || !('offsetParent' in parent)) {
    return null;
  }
  return parent as PlannerPatternOffsetNode;
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
    current = nextOffsetParent(current);
  }
  if (current !== origin) {
    return { x: 0, y: 0 };
  }
  return { x: Math.round(x), y: Math.round(y) };
}
