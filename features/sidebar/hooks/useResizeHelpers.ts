export function clampResizeValue(
  value: number,
  clamp: boolean,
  min: number | undefined,
  max: number | undefined
): number {
  if (!clamp) return value;
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

export function finalizeResizeOnMouseUp(params: {
  calculateValue: (event: MouseEvent) => number;
  clamp: boolean;
  event: MouseEvent;
  max: number | undefined;
  min: number | undefined;
  onResizeEnd?: (value: number) => void;
  onValueChange?: (value: number) => void;
  pendingValue: number | null;
}): number | null {
  const { pendingValue, onValueChange, onResizeEnd, calculateValue, event, clamp, min, max } = params;

  if (pendingValue !== null) {
    onValueChange?.(pendingValue);
    onResizeEnd?.(pendingValue);
    return pendingValue;
  }

  if (onResizeEnd) {
    const finalValue = clampResizeValue(calculateValue(event), clamp, min, max);
    onResizeEnd(finalValue);
    return finalValue;
  }

  return null;
}
