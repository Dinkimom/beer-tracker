'use client';

import { useState, type PointerEvent } from 'react';

import { SwimlanePinButton } from '@/features/swimlane/components/SwimlanePinButton';

interface SwimlanePinControlProps {
  assigneeId: string;
  isPinned: boolean;
  onTogglePin?: (assigneeId: string) => void;
}

/**
 * Какой пин сейчас под курсором. Строка переезжает в блок закреплённых,
 * и это значение позволяет плашке не мигнуть, если узел сместился под курсором.
 */
let heldPinAssigneeId: string | null = null;

export function resolveSwimlanePinControlVisibilityClass(isPinned: boolean): string {
  if (isPinned) {
    return 'opacity-100';
  }
  return 'opacity-0 transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100 swimlane-row-resizing:!opacity-0';
}

export function rectContainsPointer(
  rect: Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'>,
  x: number,
  y: number
): boolean {
  if (rect.width <= 0 || rect.height <= 0) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function swimlanePinPlateColor(isDark: boolean): string {
  return isDark ? 'rgb(255 255 255 / 0.1)' : '#f3f4f6';
}

function currentSwimlanePinPlateColor(): string {
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return swimlanePinPlateColor(isDark);
}

function releaseHeldPinIfLeft(event: PointerEvent<HTMLDivElement>, assigneeId: string) {
  const node = event.currentTarget;
  if (!node.isConnected) return;
  if (rectContainsPointer(node.getBoundingClientRect(), event.clientX, event.clientY)) return;
  if (heldPinAssigneeId === assigneeId) heldPinAssigneeId = null;
}

export function SwimlanePinControl({ assigneeId, isPinned, onTogglePin }: SwimlanePinControlProps) {
  const [pointerOver, setPointerOver] = useState(() => heldPinAssigneeId === assigneeId);

  if (!onTogglePin) {
    return null;
  }

  const holdPlate = pointerOver;
  const visibilityClass = holdPlate
    ? 'opacity-100 swimlane-row-resizing:!opacity-0'
    : resolveSwimlanePinControlVisibilityClass(isPinned);

  return (
    <div
      className={`flex h-6 w-6 shrink-0 items-center justify-center leading-none ${visibilityClass}`}
      onPointerEnter={() => {
        heldPinAssigneeId = assigneeId;
        setPointerOver(true);
      }}
      onPointerLeave={(event) => {
        releaseHeldPinIfLeft(event, assigneeId);
        if (heldPinAssigneeId !== assigneeId) setPointerOver(false);
      }}
    >
      <SwimlanePinButton
        holdHoverPlate={holdPlate}
        isPinned={isPinned}
        plateColor={
          holdPlate
            ? currentSwimlanePinPlateColor()
            : undefined
        }
        onToggle={() => onTogglePin(assigneeId)}
      />
    </div>
  );
}
