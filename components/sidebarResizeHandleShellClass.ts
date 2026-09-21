import { ZIndex } from '@/constants';

export function sidebarResizeHandleShellClass({
  fixedIconInViewport,
  isResizing,
  positionClass,
  widthClass = 'w-1.5',
  zIndexClass,
}: {
  fixedIconInViewport: boolean;
  isResizing: boolean;
  positionClass: string;
  widthClass?: string;
  zIndexClass?: string;
}): string {
  const position = fixedIconInViewport ? '' : `absolute top-0 bottom-0 ${positionClass}`;
  const zIndex =
    zIndexClass ??
    (fixedIconInViewport
      ? ZIndex.class('stickyLeftColumn')
      : ZIndex.class('stickyElevated'));
  const resizing = isResizing ? 'bg-blue-500' : '';
  return `${position} ${widthClass} cursor-col-resize ${zIndex} group ${resizing}`;
}

export function sidebarResizeSidePositionClass(side: 'left' | 'right'): string {
  return side === 'left' ? 'left-0' : 'right-0';
}
