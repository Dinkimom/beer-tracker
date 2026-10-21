'use client';

import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { Developer, Task } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';

import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';

import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { AssigneeSubmenuOptionsList } from '@/features/context-menu/components/AssigneeSubmenuOptionsList';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import {
  FLOATING_MENU_GLASS_SHELL,
  MENU_PANEL_PADDING,
  MENU_ROW_ICON,
  MENU_SUBMENU_ALIGN_INSET_PX,
  MENU_SUBMENU_SIDE_OFFSET_PX,
} from '@/features/context-menu/contextMenuClasses';
import {
  buildAssigneeAvailabilitySegments,
  groupAssigneesByPlatform,
} from '@/features/context-menu/utils/assigneePickerOptions';
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
  const groups = useMemo(() => groupAssigneesByPlatform(developers, task.team), [developers, task.team]);
  const availabilityById = useMemo(
    () =>
      buildAssigneeAvailabilitySegments({
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
        <ContextMenuRow
          disabled={isLoading}
          icon={<Icon aria-hidden className={MENU_ROW_ICON} name="user" />}
          label={t('sprintPlanner.contextMenu.changeAssignee')}
          submenuOpen={isOpen}
          value={currentName}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          alignOffset={-MENU_SUBMENU_ALIGN_INSET_PX}
          className={`relative flex w-[320px] max-w-[calc(100vw-40px)] flex-col overflow-hidden outline-none ${FLOATING_MENU_GLASS_SHELL} ${ZIndex.class('submenu')} ${OVERLAY_FLOATING_ANIMATION}`}
          collisionPadding={10}
          data-submenu="true"
          role="listbox"
          side="right"
          sideOffset={MENU_SUBMENU_SIDE_OFFSET_PX}
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
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin-custom ${MENU_PANEL_PADDING}`}
            style={{ maxHeight: `min(${ASSIGNEE_SUBMENU_MAX_HEIGHT_PX}px, calc(100vh - 20px))` }}
          >
            <AssigneeSubmenuOptionsList
              assigneePointsStats={options.assigneePointsStats}
              availabilityById={availabilityById}
              groups={groups}
              isQaTask={task.team === 'QA'}
              selectedAssigneeId={selectedAssigneeId}
              onSelect={onSelect}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
