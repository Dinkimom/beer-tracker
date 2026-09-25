'use client';

import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { Developer, Task } from '@/types';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { formatPointsForDisplay } from '@/lib/pointsUtils';

const TOTAL_STORY_POINTS = 20;
const TOTAL_TEST_POINTS = 25;

type PlatformKey = 'Back' | 'Other' | 'QA' | 'Web';

function developerNameInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getDeveloperPlatformKey(developer: Developer): PlatformKey {
  if (developer.role === 'tester') return 'QA';
  const platforms = developer.platforms ?? [];
  if (platforms.includes('back')) return 'Back';
  if (platforms.includes('web')) return 'Web';
  return 'Other';
}

/** Группа пикера, которой соответствует проставленная платформа задачи. */
export function assigneePickerGroupIsSuitable(
  platformKey: PlatformKey,
  taskTeam: string | undefined,
): boolean {
  const team = (taskTeam ?? '').toLowerCase();
  if (team === 'qa') return platformKey === 'QA';
  if (team === 'back') return platformKey === 'Back';
  if (team === 'web') return platformKey === 'Web';
  if (team === 'devops') return platformKey === 'Back' || platformKey === 'Web';
  return false;
}

/** Порядок платформ в пикере: подходящая платформе задачи — первой */
export function getAssigneePickerPlatformOrder(taskTeam: string | undefined): PlatformKey[] {
  const team = (taskTeam ?? '').toLowerCase();
  if (team === 'qa') return ['QA', 'Back', 'Web', 'Other'];
  if (team === 'back') return ['Back', 'Web', 'QA', 'Other'];
  if (team === 'web') return ['Web', 'Back', 'QA', 'Other'];
  return ['Back', 'Web', 'QA', 'Other'];
}

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
  platformKey: PlatformKey,
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

  const byPlatform = new Map<PlatformKey, Developer[]>();
  developers.forEach((developer) => {
    const key = getDeveloperPlatformKey(developer);
    const list = byPlatform.get(key) ?? [];
    list.push(developer);
    byPlatform.set(key, list);
  });

  return (
    <>
      {getAssigneePickerPlatformOrder(task.team).map((platformKey, orderIndex) => {
        const list = byPlatform.get(platformKey) ?? [];
        if (list.length === 0) return null;
        const label = platformLabel(platformKey, t);
        const isFirst = orderIndex === 0;
        return (
          <div key={platformKey}>
            <div
              className={`px-3 py-1.5 ${!isFirst ? 'mt-0.5 border-t border-gray-100 dark:border-gray-700' : ''}`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {assigneePickerGroupIsSuitable(platformKey, task.team)
                  ? t('sprintPlanner.occupancy.assigneePicker.suitable', { label })
                  : label}
              </p>
            </div>
            {list.map((developer) => {
              const isQaPicker = task.team === 'QA';
              const entry = assigneePointsStats.byAssignee.get(developer.id);
              const points = isQaPicker ? (entry?.testPoints ?? 0) : (entry?.storyPoints ?? 0);
              const total = isQaPicker ? TOTAL_TEST_POINTS : TOTAL_STORY_POINTS;
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
                    initials={developerNameInitials(developer.name)}
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
