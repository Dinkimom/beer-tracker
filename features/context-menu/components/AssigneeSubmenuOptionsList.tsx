'use client';

import type { AssigneePickerGroup } from '@/features/context-menu/utils/assigneePickerOptions';
import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';
import type { Developer } from '@/types';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  MENU_ROW,
  MENU_ROW_CHECK,
  MENU_ROW_STACK,
  MENU_ROW_VALUE,
  MENU_SECTION_LABEL,
  MENU_SEPARATOR,
} from '@/features/context-menu/contextMenuClasses';
import {
  ASSIGNEE_TARGET_STORY_POINTS,
  ASSIGNEE_TARGET_TEST_POINTS,
} from '@/features/context-menu/utils/assigneePickerOptions';
import { availabilityKindMessageKey } from '@/features/swimlane/utils/availabilityCardKind';
import { formatPointsForDisplay } from '@/lib/pointsUtils';
import { getInitials } from '@/utils/displayUtils';


interface AssigneeSubmenuOptionsListProps {
  assigneePointsStats: AssigneePointsStats;
  availabilityById: Map<string, AvailabilitySegment[]>;
  groups: AssigneePickerGroup[];
  /** QA-задача: показываем test points вместо story points. */
  isQaTask: boolean;
  selectedAssigneeId: string;
  onSelect: (assigneeId: string) => void;
}

export function AssigneeSubmenuOptionsList({
  assigneePointsStats,
  availabilityById,
  groups,
  isQaTask,
  selectedAssigneeId,
  onSelect,
}: AssigneeSubmenuOptionsListProps) {
  const { t } = useI18n();

  if (groups.length === 0) {
    return (
      <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
        {t('sprintPlanner.contextMenu.assigneePicker.empty')}
      </div>
    );
  }

  const availabilityLine = (developerId: string): string | undefined =>
    availabilityById
      .get(developerId)
      ?.map((segment) =>
        t('sprintPlanner.swimlane.availability.chipLabel', {
          label: t(availabilityKindMessageKey(segment.kind)),
          range: segment.dateRangeLabel,
        })
      )
      .join('; ');

  const renderDeveloper = (developer: Developer) => {
    const entry = assigneePointsStats.byAssignee.get(developer.id);
    const points = isQaTask ? (entry?.testPoints ?? 0) : (entry?.storyPoints ?? 0);
    const absence = availabilityLine(developer.id);
    const isSelected = developer.id === selectedAssigneeId;
    return (
      <Button
        key={developer.id}
        aria-selected={isSelected}
        className={MENU_ROW}
        role="option"
        type="button"
        variant="ghost"
        onMouseDown={(event) => {
          // До blur/закрытия поповера: иначе клик теряется на перерисовке
          event.preventDefault();
          event.stopPropagation();
          onSelect(developer.id);
        }}
      >
        <Avatar
          avatarUrl={developer.avatarUrl}
          initials={getInitials(developer.name)}
          size="sm"
        />
        <span className="min-w-0 flex-1">
          <span className={`block truncate ${isSelected ? 'font-medium' : ''}`}>{developer.name}</span>
          {absence ? (
            <span
              className="block truncate text-xs leading-4 text-amber-700 dark:text-amber-300"
              title={absence}
            >
              {absence}
            </span>
          ) : null}
        </span>
        <span className={`${MENU_ROW_VALUE} tabular-nums`}>
          {t('sprintPlanner.contextMenu.assigneePicker.pointsOfTotal', {
            points: formatPointsForDisplay(points),
            total: formatPointsForDisplay(isQaTask ? ASSIGNEE_TARGET_TEST_POINTS : ASSIGNEE_TARGET_STORY_POINTS),
            unit: isQaTask ? 'tp' : 'sp',
          })}
        </span>
        <span className="flex w-4 shrink-0 justify-center">
          {isSelected ? <Icon className={MENU_ROW_CHECK} name="check" /> : null}
        </span>
      </Button>
    );
  };

  return (
    <>
      {groups.map((group, index) => {
        const label =
          group.platformKey === 'Other'
            ? t('sprintPlanner.contextMenu.assigneePicker.noPlatform')
            : group.platformKey;
        return (
          <div key={group.platformKey} className={MENU_ROW_STACK} role="group">
            {index > 0 ? <div className={MENU_SEPARATOR} role="separator" /> : null}
            <div className={MENU_SECTION_LABEL}>
              {group.suitable
                ? t('sprintPlanner.contextMenu.assigneePicker.suitable', { label })
                : label}
            </div>
            {group.developers.map(renderDeveloper)}
          </div>
        );
      })}
    </>
  );
}
