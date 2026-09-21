'use client';

import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { Developer, Task } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';

import { useEffect, useMemo, useRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_ACTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_ITEM_ROW_SUBMENU,
} from '@/features/context-menu/contextMenuClasses';
import { calculateSubmenuPosition } from '@/features/context-menu/utils/submenuPositioning';
import { AssigneePickerList } from '@/features/sprint/components/SprintPlanner/occupancy/AssigneePickerList';
import { buildAssigneePickerAvailabilityLines } from '@/features/sprint/components/SprintPlanner/occupancy/buildAssigneePickerAvailabilityLines';
import { getDevelopersForTaskSorted } from '@/features/sprint/utils/getDevelopersForTask';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { DELAYS } from '@/utils/constants';

export interface ContextMenuAssigneeOptions {
  assigneePointsStats: AssigneePointsStats;
  availability?: QuarterlyAvailability | null;
  developers: Developer[];
  minStoryPointsForAssignee?: number;
  minTestPointsForAssignee?: number;
  sprintStartDate: Date;
}

interface AssigneeSubmenuProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  isLoading: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  options: ContextMenuAssigneeOptions;
  selectedAssigneeId: string;
  task: Task;
  onSelect: (assigneeId: string) => void;
  onToggle: () => void;
}

export function AssigneeSubmenu({
  buttonRef,
  isLoading,
  isOpen,
  menuRef,
  options,
  selectedAssigneeId,
  task,
  onSelect,
  onToggle,
}: AssigneeSubmenuProps) {
  const { t } = useI18n();
  const submenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isOpen || !submenuRef.current || !buttonRef.current || !menuRef.current) {
      return;
    }
    const menuElement = menuRef.current;
    const updatePosition = () => {
      if (!submenuRef.current || !buttonRef.current || !menuElement) return;
      const submenuParent = submenuRef.current.parentElement;
      if (!submenuParent) return;
      const { left, top } = calculateSubmenuPosition(
        menuElement.getBoundingClientRect(),
        buttonRef.current.getBoundingClientRect(),
        submenuRef.current.getBoundingClientRect(),
        submenuParent.getBoundingClientRect()
      );
      submenuRef.current.style.left = `${left}px`;
      submenuRef.current.style.top = `${top}px`;
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updatePosition();
        setTimeout(updatePosition, DELAYS.POSITIONING);
      });
    });
  }, [buttonRef, developers.length, isOpen, menuRef]);

  const overlay = useOverlayPresence(isOpen);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        className={`${CONTEXT_MENU_ITEM_ROW_SUBMENU} !items-start ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${
          isOpen ? CONTEXT_MENU_ITEM_ROW_ACTIVE : ''
        } ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
        disabled={isLoading}
        type="button"
        variant="ghost"
        onClick={onToggle}
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
      {overlay.mounted ? (
        <div
          ref={submenuRef}
          className={`absolute flex max-h-[320px] w-max min-w-[260px] max-w-[min(320px,calc(100vw-40px))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-700 dark:bg-gray-800 ${ZIndex.class('submenu')} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          data-submenu="true"
          role="listbox"
          onAnimationEnd={overlay.onAnimationEnd}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AssigneePickerList
              assigneePointsStats={options.assigneePointsStats}
              developerAvailabilityById={developerAvailabilityById}
              developers={developers}
              minStoryPointsForAssignee={options.minStoryPointsForAssignee}
              minTestPointsForAssignee={options.minTestPointsForAssignee}
              selectedAssigneeId={selectedAssigneeId}
              task={task}
              onSelect={onSelect}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
