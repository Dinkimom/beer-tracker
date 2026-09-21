'use client';

import type { Developer } from '@/types';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { getInitials } from '@/utils/displayUtils';

function developerVisibilityCheckboxId(developerId: string): string {
  return `developer-visibility-${developerId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function developerItemRowClassName(isHidden: boolean, isDragging: boolean): string {
  const hiddenClass = isHidden ? 'opacity-80' : '';
  const draggingClass = isDragging
    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
    : '';
  return `group/item flex items-center gap-2 pr-1.5 py-1 rounded transition-colors ${hiddenClass} ${draggingClass}`;
}

function developerVisibilityStatusClassName(isHidden: boolean): string {
  return isHidden
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';
}

interface SortableDeveloperItemProps {
  developer: Developer;
  hideAvatar?: boolean;
  isHidden: boolean;
  isRemoving?: boolean;
  nameContent?: React.ReactNode;
  onRemove?: () => void;
  onToggleVisibility: () => void;
}

export function SortableDeveloperItem({
  developer,
  hideAvatar = false,
  isHidden,
  isRemoving = false,
  nameContent,
  onRemove,
  onToggleVisibility,
}: SortableDeveloperItemProps) {
  const { t } = useI18n();
  const visibilityLabel = isHidden
    ? t('sidebar.developersManagement.visibilityHidden')
    : t('sidebar.developersManagement.visibilityShown');
  const visibilityCheckboxId = developerVisibilityCheckboxId(developer.id);
  const visibilityToggleLabel = isHidden
    ? t('sidebar.developersManagement.showInPlanner')
    : t('sidebar.developersManagement.hideInPlanner');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: developer.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className={developerItemRowClassName(isHidden, isDragging)}
      style={style}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 transition-colors"
        title={t('sidebar.developersManagement.dragReorderTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon className="text-gray-400 dark:text-gray-500 w-4.5 h-4.5" name="drag-handle" />
      </div>

      <div className="flex w-8 justify-center">
        <input
          aria-label={`${visibilityToggleLabel} ${developer.name}`}
          checked={!isHidden}
          className="w-3.5 h-3.5 accent-blue-500 dark:accent-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-400 dark:focus:ring-blue-400 flex-shrink-0"
          id={visibilityCheckboxId}
          title={t('sidebar.developersManagement.toggleInPlannerTitle', {
            action: visibilityToggleLabel,
          })}
          type="checkbox"
          onChange={onToggleVisibility}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <label
        className="inline-flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
        htmlFor={visibilityCheckboxId}
      >
        {hideAvatar ? null : (
          <Avatar
            avatarUrl={developer.avatarUrl}
            initials={getInitials(developer.name)}
            size="sm"
            title={developer.name}
          />
        )}
        <span className="min-w-0 flex-1 leading-tight">
          {nameContent ? (
            <span className="block min-w-0">{nameContent}</span>
          ) : (
            <span className="block truncate text-sm text-gray-700 dark:text-gray-300">
              {developer.name}
            </span>
          )}
          <span
            className={`block text-[11px] leading-snug ${developerVisibilityStatusClassName(isHidden)}`}
          >
            {visibilityLabel}
          </span>
        </span>
      </label>
      {onRemove ? (
        <button
          aria-label={t('sidebar.developersManagement.removeFromTeamAria', {
            name: developer.name,
          })}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity"
          disabled={isRemoving}
          title={
            isRemoving
              ? t('sidebar.developersManagement.removing')
              : t('sidebar.developersManagement.removeFromTeamTitle')
          }
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Icon className="h-3.5 w-3.5" name="x" />
        </button>
      ) : null}
    </div>
  );
}
