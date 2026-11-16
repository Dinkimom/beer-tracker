export function applySidebarResizeEnd(params: {
  closeThreshold: number;
  finalWidth: number;
  minWidth: number;
  onToggle?: () => void;
  onWidthChange?: (width: number) => void;
  wasOpenOnResizeStart: boolean;
  /** Ширина до жеста: закрытый стягиванием сайдбар откроется снова с ней, а не с той, до которой его стянули. */
  widthOnResizeStart?: number;
}): void {
  const clampedWidth = Math.max(params.finalWidth, params.minWidth);
  const shouldClose =
    params.wasOpenOnResizeStart && params.finalWidth < params.closeThreshold && params.onToggle != null;
  if (shouldClose) {
    params.onToggle!();
    if (params.widthOnResizeStart !== undefined) {
      params.onWidthChange?.(Math.max(params.widthOnResizeStart, params.minWidth));
    }
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
