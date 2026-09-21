'use client';

import type { AssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import type { Developer, Task, TaskPosition } from '@/types';
import type { QuarterlyAvailability } from '@/types/quarterly';
import type { CSSProperties } from 'react';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  FLOATING_MENU_FIT_BODY,
  FLOATING_MENU_FIT_WIDTH,
} from '@/features/context-menu/contextMenuClasses';
import { useDeferredOverlayClose } from '@/hooks/useOverlayPresence';

import { AssigneePickerList } from './AssigneePickerList';
import { buildAssigneePickerAvailabilityLines } from './buildAssigneePickerAvailabilityLines';

const PICKER_MAX_HEIGHT = 280;
const PICKER_MIN_WIDTH = 220;
const PICKER_OFFSET = 4;
const VIEWPORT_PADDING = 8;

interface OccupancyAssigneePickerProps {
  anchorRect: DOMRect;
  assigneePointsStats: AssigneePointsStats;
  /** Отпуска и техспринты из квартального планирования — для подсказки в пикере */
  availability?: QuarterlyAvailability | null;
  developers: Developer[];
  /** Минимум оценки (из validationThresholds.occupancy), чтобы показывать «Подходит: …» */
  minStoryPointsForAssignee?: number;
  minTestPointsForAssignee?: number;
  position: TaskPosition;
  sprintStartDate: Date;
  task: Task;
  onClose: () => void;
  onSelect: (assigneeId: string) => void;
}

export function OccupancyAssigneePicker({
  anchorRect,
  assigneePointsStats,
  availability,
  developers,
  minStoryPointsForAssignee = 0,
  minTestPointsForAssignee = 0,
  onClose,
  onSelect,
  position,
  sprintStartDate,
  task,
}: OccupancyAssigneePickerProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const overlay = useDeferredOverlayClose(onClose);
  const requestClose = overlay.requestClose;
  const developerAvailabilityById = useMemo(
    () => buildAssigneePickerAvailabilityLines({ availability, developers, sprintStartDate }),
    [availability, developers, sprintStartDate]
  );

  useEffect(() => {
    if (overlay.isExiting) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        requestClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [overlay.isExiting, requestClose]);

  const pickerStyle = useMemo((): CSSProperties => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    const spaceBelow = viewportHeight - anchorRect.bottom - PICKER_OFFSET - VIEWPORT_PADDING;
    const spaceAbove = anchorRect.top - PICKER_OFFSET - VIEWPORT_PADDING;
    const showAbove =
      spaceBelow < PICKER_MAX_HEIGHT && spaceAbove >= Math.min(spaceBelow, PICKER_MAX_HEIGHT);

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    let left = anchorCenterX - PICKER_MIN_WIDTH / 2;
    if (left + PICKER_MIN_WIDTH > viewportWidth - VIEWPORT_PADDING) {
      left = viewportWidth - PICKER_MIN_WIDTH - VIEWPORT_PADDING;
    }
    left = Math.max(VIEWPORT_PADDING, left);

    if (showAbove) {
      return {
        left,
        bottom: viewportHeight - (anchorRect.top - PICKER_OFFSET),
        maxHeight: Math.max(100, anchorRect.top - PICKER_OFFSET - VIEWPORT_PADDING),
        zIndex: ZIndex.modalBackdrop + 10,
      };
    }

    return {
      left,
      top: anchorRect.bottom + PICKER_OFFSET,
      zIndex: ZIndex.modalBackdrop + 10,
    };
  }, [anchorRect]);

  const content = (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-transparent"
        style={{ zIndex: ZIndex.modalBackdrop }}
        onClick={requestClose}
      />
      <div
        ref={containerRef}
        aria-label={t('sprintPlanner.occupancy.assigneePicker.ariaLabel')}
        className={`fixed max-h-[240px] overflow-auto border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 ${FLOATING_MENU_FIT_WIDTH} rounded-lg ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        role="listbox"
        style={pickerStyle}
        onAnimationEnd={overlay.onAnimationEnd}
      >
        <div className={FLOATING_MENU_FIT_BODY}>
          <AssigneePickerList
            assigneePointsStats={assigneePointsStats}
            developerAvailabilityById={developerAvailabilityById}
            developers={developers}
            minStoryPointsForAssignee={minStoryPointsForAssignee}
            minTestPointsForAssignee={minTestPointsForAssignee}
            selectedAssigneeId={position.assignee}
            task={task}
            onSelect={onSelect}
          />
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
