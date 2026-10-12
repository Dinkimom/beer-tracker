'use client';

import type { TaskCardFieldId } from '@/lib/taskCard/taskCardSlots';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Icon } from '@/components/Icon';

const CHIP_CLASS =
  'inline-flex max-w-full items-center gap-0.5 rounded-md border py-1 pl-1 pr-1 text-[13px] font-medium leading-none transition-colors';
const CHIP_IDLE =
  'border-gray-300 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
const CHIP_ON =
  'border-blue-700/20 bg-blue-600 text-white dark:border-blue-400/35 dark:bg-blue-500/20 dark:text-blue-200';

type TaskCardSlotDragData =
  | { field: TaskCardFieldId; kind: 'builtin' }
  | { fieldId: string; kind: 'custom' };

interface TaskCardSlotChipProps {
  data: TaskCardSlotDragData;
  dragLabel: string;
  hidden: boolean;
  id: string;
  label: string;
  removeLabel?: string;
  selected: boolean;
  visibilityLabel: string;
  onRemove?: () => void;
  onSelect: () => void;
  onToggleHidden: () => void;
}

export function TaskCardSlotChip({
  data,
  dragLabel,
  hidden,
  id,
  label,
  onRemove,
  onSelect,
  onToggleHidden,
  removeLabel,
  selected,
  visibilityLabel,
}: TaskCardSlotChipProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ data, id });
  const { role: _role, ...handleAttributes } = attributes;
  const style = {
    opacity: isDragging ? 0 : undefined,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={`${CHIP_CLASS} ${selected ? CHIP_ON : CHIP_IDLE} ${hidden ? 'opacity-50' : ''}`}
      style={style}
    >
      <button
        aria-label={dragLabel}
        className="cursor-grab touch-none rounded p-0.5 transition-colors hover:bg-black/5 active:cursor-grabbing dark:hover:bg-white/10"
        type="button"
        {...handleAttributes}
        {...listeners}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-60" name="grip-vertical" />
      </button>
      <button
        aria-pressed={selected}
        className="cursor-pointer truncate rounded px-1 py-0.5 transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
        type="button"
        onClick={onSelect}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        {label}
      </button>
      <button
        aria-label={visibilityLabel}
        aria-pressed={!hidden}
        className="cursor-pointer rounded p-0.5 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
        type="button"
        onClick={onToggleHidden}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <Icon className="h-4 w-4" name={hidden ? 'eye-off' : 'eye'} />
      </button>
      {onRemove && removeLabel ? (
        <button
          aria-label={removeLabel}
          className="cursor-pointer rounded p-0.5 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
          type="button"
          onClick={onRemove}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <Icon className="h-4 w-4" name="x" />
        </button>
      ) : null}
    </div>
  );
}
