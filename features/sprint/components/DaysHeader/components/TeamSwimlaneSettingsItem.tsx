'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

function teamSwimlaneVisibilityCheckboxId(): string {
  return `developer-visibility-${TEAM_SWIMLANE_ASSIGNEE_ID.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function rowClassName(isHidden: boolean): string {
  return `flex items-center gap-2 pr-1.5 py-1 rounded transition-colors ${isHidden ? 'opacity-80' : ''}`;
}

function visibilityStatusClassName(isHidden: boolean): string {
  return isHidden
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';
}

interface TeamSwimlaneSettingsItemProps {
  isHidden: boolean;
  onToggleVisibility: () => void;
}

export function TeamSwimlaneSettingsItem({
  isHidden,
  onToggleVisibility,
}: TeamSwimlaneSettingsItemProps) {
  const { t } = useI18n();
  const teamLaneName = t('sprintPlanner.swimlane.teamLane.name');
  const checkboxId = teamSwimlaneVisibilityCheckboxId();
  const statusLabel = isHidden
    ? t('sidebar.developersManagement.visibilityHidden')
    : t('sidebar.developersManagement.visibilityShown');
  const toggleLabel = isHidden
    ? t('sidebar.developersManagement.showInPlanner')
    : t('sidebar.developersManagement.hideInPlanner');

  return (
    <div className={rowClassName(isHidden)}>
      <div aria-hidden className="w-[22px] flex-shrink-0" />

      <div className="flex w-8 justify-center">
        <input
          aria-label={`${toggleLabel} ${teamLaneName}`}
          checked={!isHidden}
          className="w-3.5 h-3.5 accent-blue-500 dark:accent-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-400 dark:focus:ring-blue-400 flex-shrink-0"
          id={checkboxId}
          title={t('sidebar.developersManagement.toggleInPlannerTitle', {
            action: toggleLabel,
          })}
          type="checkbox"
          onChange={onToggleVisibility}
        />
      </div>

      <label
        className="inline-flex min-w-0 flex-1 cursor-pointer items-center"
        htmlFor={checkboxId}
      >
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-sm text-gray-700 dark:text-gray-300 truncate">{teamLaneName}</span>
          <span className={`block text-[11px] leading-snug ${visibilityStatusClassName(isHidden)}`}>
            {statusLabel}
          </span>
        </span>
      </label>
    </div>
  );
}
