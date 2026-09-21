'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { CheckboxOption } from './CheckboxOption';

interface SortableSidebarTabItemProps {
  id: string;
  isFirst: boolean;
  isLast: boolean;
  label: string;
  visible: boolean;
  onToggleVisible: () => void;
}

export function SortableSidebarTabItem({
  id,
  isFirst: _isFirst,
  isLast: _isLast,
  label,
  visible,
  onToggleVisible,
}: SortableSidebarTabItemProps) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    opacity: isDragging ? 0.6 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/40"
      style={style}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          {...attributes}
          {...listeners}
          aria-label={t('settings.sidebarTabList.dragReorderAria')}
          className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded hover:bg-gray-200/60 dark:hover:bg-gray-600/60"
          type="button"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon className="w-3.5 h-3.5" name="drag-handle" />
        </button>
        <span className="text-sm text-gray-800 dark:text-gray-100 truncate">
          {label}
        </span>
      </div>
      <CheckboxOption
        checked={visible}
        label={t('settings.sidebarTabList.showToggle')}
        onChange={onToggleVisible}
      />
    </div>
  );
}
