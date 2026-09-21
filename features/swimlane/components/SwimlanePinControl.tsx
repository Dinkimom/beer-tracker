'use client';

import { SwimlanePinButton } from '@/features/swimlane/components/SwimlanePinButton';

interface SwimlanePinControlProps {
  assigneeId: string;
  isPinned: boolean;
  onTogglePin?: (assigneeId: string) => void;
}

export function resolveSwimlanePinControlVisibilityClass(isPinned: boolean): string {
  if (isPinned) {
    return 'opacity-100';
  }
  return 'opacity-0 transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100 swimlane-row-resizing:!opacity-0';
}

export function SwimlanePinControl({ assigneeId, isPinned, onTogglePin }: SwimlanePinControlProps) {
  if (!onTogglePin) {
    return null;
  }
  return (
    <div
      className={`flex h-6 w-6 shrink-0 items-center justify-center leading-none ${resolveSwimlanePinControlVisibilityClass(isPinned)}`}
    >
      <SwimlanePinButton isPinned={isPinned} onToggle={() => onTogglePin(assigneeId)} />
    </div>
  );
}
