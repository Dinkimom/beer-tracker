'use client';

import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { Developer, Task, TaskPosition } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';

import { useMemo } from 'react';

import { AnchoredPopover } from '@/components/AnchoredPopover';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_MENU_FIT_BODY, FLOATING_MENU_FIT_WIDTH } from '@/features/context-menu/contextMenuClasses';
import { useDeferredOverlayClose } from '@/hooks/useOverlayPresence';

import { AssigneePickerList } from './AssigneePickerList';
import { buildAssigneePickerAvailabilityLines } from './buildAssigneePickerAvailabilityLines';

interface AssigneePickerProps {
  anchorRect: DOMRect;
  assigneePointsStats: AssigneePointsStats;
  /** Отпуска и другие отсутствия из квартального планирования — для подсказки в пикере */
  availability?: QuarterlyAvailability | null;
  developers: Developer[];
  position: TaskPosition;
  sprintStartDate: Date;
  task: Task;
  onClose: () => void;
  onSelect: (assigneeId: string) => void;
}

export function AssigneePicker({
  anchorRect,
  assigneePointsStats,
  availability,
  developers,
  onClose,
  onSelect,
  position,
  sprintStartDate,
  task,
}: AssigneePickerProps) {
  const { t } = useI18n();
  const overlay = useDeferredOverlayClose(onClose);
  const developerAvailabilityById = useMemo(
    () => buildAssigneePickerAvailabilityLines({ availability, developers, sprintStartDate, t }),
    [availability, developers, sprintStartDate, t]
  );

  return (
    <AnchoredPopover
      align="center"
      anchor={anchorRect}
      className={`max-h-[240px] overflow-auto ${FLOATING_MENU_FIT_WIDTH}`}
      open={!overlay.isExiting}
      sideOffset={4}
      onDismiss={overlay.requestClose}
    >
      <div
        aria-label={t('sprintPlanner.occupancy.assigneePicker.ariaLabel')}
        className={FLOATING_MENU_FIT_BODY}
        role="listbox"
      >
        <AssigneePickerList
          assigneePointsStats={assigneePointsStats}
          developerAvailabilityById={developerAvailabilityById}
          developers={developers}
          selectedAssigneeId={position.assignee}
          task={task}
          onSelect={onSelect}
        />
      </div>
    </AnchoredPopover>
  );
}
