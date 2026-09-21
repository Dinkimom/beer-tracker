export function sidebarResizeInlineIndicatorOpacityClass(
  revealOnHover: boolean,
  isActive: boolean
): string {
  if (!revealOnHover) {
    return 'opacity-40 group-hover:opacity-100';
  }
  if (isActive) {
    return 'opacity-100';
  }
  return 'opacity-0 group-hover:opacity-100';
}
