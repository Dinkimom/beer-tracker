export function applySidebarResizeEnd(params: {
  closeThreshold: number;
  finalWidth: number;
  minWidth: number;
  onToggle?: () => void;
  onWidthChange?: (width: number) => void;
  wasOpenOnResizeStart: boolean;
}): void {
  const clampedWidth = Math.max(params.finalWidth, params.minWidth);
  const shouldClose =
    params.wasOpenOnResizeStart && params.finalWidth < params.closeThreshold && params.onToggle != null;
  if (shouldClose) {
    params.onToggle!();
    return;
  }
  const shouldPersistWidth =
    params.onWidthChange != null &&
    params.finalWidth > 0 &&
    (!params.wasOpenOnResizeStart || params.finalWidth >= params.closeThreshold);
  if (shouldPersistWidth) {
    params.onWidthChange!(clampedWidth);
  }
}
