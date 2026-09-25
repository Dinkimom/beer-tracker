'use client';

import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { Developer, Task } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';

import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_ACTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_ITEM_ROW_SUBMENU,
} from '@/features/context-menu/contextMenuClasses';
import { AssigneePickerList } from '@/features/sprint/components/SprintPlanner/occupancy/AssigneePickerList';
import { buildAssigneePickerAvailabilityLines } from '@/features/sprint/components/SprintPlanner/occupancy/buildAssigneePickerAvailabilityLines';
import { getDevelopersForTaskSorted } from '@/features/sprint/utils/getDevelopersForTask';

export interface ContextMenuAssigneeOptions {
  assigneePointsStats: AssigneePointsStats;
  availability?: QuarterlyAvailability | null;
  developers: Developer[];
  sprintStartDate: Date;
}

interface AssigneeSubmenuProps {
  isLoading: boolean;
  isOpen: boolean;
  options: ContextMenuAssigneeOptions;
  selectedAssigneeId: string;
  task: Task;
  onSelect: (assigneeId: string) => void;
  onToggle: () => void;
}

const ASSIGNEE_SUBMENU_MAX_HEIGHT_PX = 320;

export function AssigneeSubmenu({
  isLoading,
  isOpen,
  options,
  selectedAssigneeId,
  task,
  onSelect,
  onToggle,
}: AssigneeSubmenuProps) {
  const { t } = useI18n();
  const developers = useMemo(
    () => getDevelopersForTaskSorted(options.developers, task),
    [options.developers, task]
  );
  const developerAvailabilityById = useMemo(
    () =>
      buildAssigneePickerAvailabilityLines({
        availability: options.availability,
        developers,
        sprintStartDate: options.sprintStartDate,
      }),
    [developers, options.availability, options.sprintStartDate]
  );
  const currentName =
    developers.find((developer) => developer.id === selectedAssigneeId)?.name ??
    (task.team === 'QA' ? task.qaEngineerName : task.assigneeName);

  return (
    <Popover.Root
      modal={false}
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen !== isOpen) onToggle();
      }}
    >
      <Popover.Trigger asChild>
        <Button
          className={`${CONTEXT_MENU_ITEM_ROW_SUBMENU} !items-start ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${
            isOpen ? CONTEXT_MENU_ITEM_ROW_ACTIVE : ''
          } ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
          disabled={isLoading}
          type="button"
          variant="ghost"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Icon
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
              name="user"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium leading-5">
                {t('sprintPlanner.contextMenu.changeAssignee')}
              </span>
              {currentName ? (
                <span className="mt-0.5 block truncate text-xs font-normal leading-4 text-gray-500 dark:text-gray-400">
                  {currentName}
                </span>
              ) : null}
            </span>
          </div>
          <Icon
            aria-hidden
            className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
            name="chevron-right"
          />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className={`flex w-max min-w-[260px] max-w-[min(320px,calc(100vw-40px))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-800 ${ZIndex.class('submenu')} ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={10}
          data-submenu="true"
          role="listbox"
          side="right"
          sideOffset={2}
          style={{
            maxHeight: `min(${ASSIGNEE_SUBMENU_MAX_HEIGHT_PX}px, calc(100vh - 20px))`,
            // Radix копирует computed z-index на портал-обёртку. Класс из ZIndex.class
            // в CSS не генерируется, без инлайна обёртка остаётся auto и подложка меню перехватывает колесо.
            zIndex: ZIndex.submenu,
          }}
          updatePositionStrategy="always"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 scrollbar-thin-custom"
            style={{ maxHeight: `min(${ASSIGNEE_SUBMENU_MAX_HEIGHT_PX}px, calc(100vh - 20px))` }}
          >
            <AssigneePickerList
              assigneePointsStats={options.assigneePointsStats}
              developerAvailabilityById={developerAvailabilityById}
              developers={developers}
              selectedAssigneeId={selectedAssigneeId}
              task={task}
              onSelect={onSelect}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
