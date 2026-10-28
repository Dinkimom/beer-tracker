'use client';

import type { AssigneePlatformKey } from '@/features/context-menu/utils/assigneePickerOptions';
import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { Developer, Task } from '@/types';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import {
  ASSIGNEE_TARGET_STORY_POINTS,
  ASSIGNEE_TARGET_TEST_POINTS,
  groupAssigneesByPlatform,
} from '@/features/context-menu/utils/assigneePickerOptions';
import { formatPointsForDisplay } from '@/lib/pointsUtils';
import { getInitials } from '@/utils/displayUtils';

function createAssigneePickerMouseDownHandler(
  onSelect: (assigneeId: string) => void,
  assigneeId: string
): (event: ReactMouseEvent) => void {
  return (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(assigneeId);
  };
}

function platformLabel(
  platformKey: AssigneePlatformKey,
  t: (key: string, params?: Record<string, number | string>) => string
): string {
  if (platformKey === 'Other') {
    return t('sprintPlanner.occupancy.assigneePicker.noPlatform');
  }
  return platformKey;
}

interface AssigneePickerListProps {
  assigneePointsStats: AssigneePointsStats;
  developerAvailabilityById?: Map<string, string>;
  developers: Developer[];
  selectedAssigneeId: string;
  task: Task;
  onSelect: (assigneeId: string) => void;
}

export function AssigneePickerList({
  assigneePointsStats,
  developers,
  developerAvailabilityById,
  selectedAssigneeId,
  task,
  onSelect,
}: AssigneePickerListProps) {
  const { t } = useI18n();

  if (developers.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        {t('sprintPlanner.occupancy.assigneePicker.empty')}
      </div>
    );
  }

  return (
    <>
      {groupAssigneesByPlatform(developers, task.team).map(({ developers: list, platformKey, suitable }, groupIndex) => {
        const label = platformLabel(platformKey, t);
        const isFirst = groupIndex === 0;
        return (
          <div key={platformKey}>
            <div
              className={`px-3 py-1.5 ${!isFirst ? 'mt-0.5 border-t border-gray-100 dark:border-gray-700' : ''}`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {suitable
                  ? t('sprintPlanner.occupancy.assigneePicker.suitable', { label })
                  : label}
              </p>
            </div>
            {list.map((developer) => {
              const isQaPicker = task.team === 'QA';
              const entry = assigneePointsStats.byAssignee.get(developer.id);
              const points = isQaPicker ? (entry?.testPoints ?? 0) : (entry?.storyPoints ?? 0);
              const total = isQaPicker ? ASSIGNEE_TARGET_TEST_POINTS : ASSIGNEE_TARGET_STORY_POINTS;
              const availabilityLine = developerAvailabilityById?.get(developer.id);
              const isSelected = developer.id === selectedAssigneeId;
              return (
                <Button
                  key={developer.id}
                  aria-selected={isSelected}
                  className={`h-auto min-h-0 w-full !rounded-none border-0 !items-start !justify-start !gap-2 !px-3 !py-2 text-left text-sm shadow-none ${
                    isSelected
                      ? 'cursor-pointer !bg-blue-50 !text-blue-700 hover:!bg-blue-50 dark:!bg-blue-900/30 dark:!text-blue-300 dark:hover:!bg-blue-900/30'
                      : 'cursor-pointer text-gray-900 hover:!bg-gray-50 dark:text-gray-100 dark:hover:!bg-gray-700'
                  }`}
                  role="option"
                  type="button"
                  variant="ghost"
                  onMouseDown={createAssigneePickerMouseDownHandler(onSelect, developer.id)}
                >
                  <Avatar
                    avatarUrl={developer.avatarUrl}
                    className="mt-0.5"
                    initials={getInitials(developer.name)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate">{developer.name}</span>
                      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {t('sprintPlanner.occupancy.assigneePicker.pointsOfTotal', {
                          points: formatPointsForDisplay(points),
                          total: formatPointsForDisplay(total),
                          unit: isQaPicker ? 'tp' : 'sp',
                        })}
                      </span>
                    </div>
                    {availabilityLine ? (
                      <p
                        className="mt-0.5 line-clamp-2 text-xs text-amber-700 dark:text-amber-300"
                        title={availabilityLine}
                      >
                        {availabilityLine}
                      </p>
                    ) : null}
                  </div>
                </Button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
