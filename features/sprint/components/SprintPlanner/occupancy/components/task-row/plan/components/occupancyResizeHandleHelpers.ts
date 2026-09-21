export function occupancyResizeGripOffset(
  compact: boolean,
  side: 'left' | 'right'
): string {
  if (compact) {
    return side === 'left' ? 'left-0.5' : 'right-0.5';
  }
  return side === 'left' ? 'left-1' : 'right-1';
}

export function occupancyResizeGripLineClass(
  isActive: boolean,
  handleColors: { line: string; lineDark: string }
): string {
  const base = `${handleColors.line} ${handleColors.lineDark}`;
  if (isActive) {
    return base;
  }
  return `${base} opacity-40 group-hover:opacity-100`;
}

export function occupancyResizeSidePositionClass(side: 'left' | 'right'): string {
  return side === 'left' ? 'left-0' : 'right-0';
}
