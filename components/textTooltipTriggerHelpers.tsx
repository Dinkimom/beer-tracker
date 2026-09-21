import { cloneElement, isValidElement } from 'react';

/** Radix-тултип и нативный `title` на триггере показываются одновременно — убираем дубль. */
function stripNativeTitle(element: React.ReactElement<{ title?: string }>): React.ReactElement {
  return cloneElement(element, { ...element.props, title: undefined });
}

export function buildTextTooltipTrigger(
  children: React.ReactElement,
  followCursor: boolean,
  setCursorPos: (pos: { x: number; y: number }) => void
): React.ReactNode {
  const triggerChild = isValidElement<{ title?: string }>(children)
    ? stripNativeTitle(children)
    : children;
  if (!followCursor) {
    return triggerChild;
  }
  return (
    <span
      style={{ display: 'contents' }}
      onMouseMove={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
    >
      {triggerChild}
    </span>
  );
}

export function resolveTextTooltipEffectiveOpen(
  open: boolean,
  singleInGroupId: string | undefined,
  group: { openId: string | null } | null
): boolean {
  if (singleInGroupId && group) {
    return open && group.openId === singleInGroupId;
  }
  return open;
}
