'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { Developer } from '@/types';

import { useState, useRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { WORKING_DAYS, ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  sprintPlannerContentRowWidthCss,
  sprintPlannerDaysHeaderContentWidthCss,
  sprintPlannerSwimlaneTimelineWidthCss,
} from '@/features/sprint/components/SprintPlanner/layout/sprintPlannerSwimlaneLayoutWidths';
import { SprintPlannerTimelineFill } from '@/features/sprint/components/SprintPlanner/layout/SprintPlannerTimelineFill';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

import { DaysRow } from './DaysHeader/components/DaysRow';
import { FeatureRowsSettingsPopup } from './DaysHeader/components/FeatureRowsSettingsPopup';
import { ParticipantsSettingsPopup } from './DaysHeader/components/ParticipantsSettingsPopup';

/** Высота шапки дат / левой колонки свимлейна — как в занятости (40 + 1px бордер). */
export const DAYS_HEADER_ROW_HEIGHT_PX = 41;

interface DaysHeaderProps {
  boardId?: number | null;
  developers?: Developer[];
  developersManagement?: {
    handleDragEnd: (activeId: string, overId: string) => void;
    hiddenIds: Set<string>;
    hideAllDevelopers: () => void;
    setSortBy: (sort: 'custom' | 'name' | 'sp' | 'tasks' | 'tp') => void;
    showAllDevelopers: () => void;
    sortBy: 'custom' | 'name' | 'sp' | 'tasks' | 'tp';
    sortedDevelopers: Developer[];
    toggleDeveloperVisibility: (id: string) => void;
  };
  /** По каждому дню — список проблемных задач и причин для тултипа иконки ошибки */
  errorDayDetails?: Map<number, DayErrorDetail[]>;
  /** Индексы дней (0..9), в которых есть ошибки планирования — в шапке показывается иконка ошибки */
  errorDayIndices?: Set<number>;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  participantsColumnWidth: number;
  sidebarOpen?: boolean;
  sidebarWidth: number;
  sprintStartDate: Date;
  /** Рабочих дней в таймлайне (длина спринта) */
  sprintTimelineWorkingDays?: number;
  viewMode: 'compact' | 'full';
  removeParticipantFromTeam?: (
    developerId: string,
    knownDisplayName?: string | null
  ) => Promise<boolean>;
}

export function DaysHeader({
  boardId = null,
  sprintStartDate,
  sprintTimelineWorkingDays = WORKING_DAYS,
  viewMode,
  sidebarWidth,
  sidebarOpen,
  developers = [],
  developersManagement,
  errorDayDetails,
  errorDayIndices,
  holidayDayIndices,
  participantsColumnWidth,
  removeParticipantFromTeam,
}: DaysHeaderProps) {
  const { t } = useI18n();
  const featureColumn = useFeatureLaneColumnUi();
  const actualSidebarWidth = sidebarOpen ? sidebarWidth : 0;

  // Ширина контента = колонка участников + таймлайн (ограничено), чтобы скролл заканчивался у конца контента
  const contentWidth = sprintPlannerDaysHeaderContentWidthCss(
    viewMode,
    participantsColumnWidth,
    actualSidebarWidth,
    sprintTimelineWorkingDays
  );

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const handleSettingsClick = () => {
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
      setIsPopupOpen(true);
    }
  };

  const rowWidth = sprintPlannerContentRowWidthCss(
    viewMode,
    participantsColumnWidth,
    actualSidebarWidth,
    sprintTimelineWorkingDays
  );

  // Ширина области дней (таймлайн) внутри шапки — как у таймлайна в строке свимлейна
  const containerWidth = sprintPlannerSwimlaneTimelineWidthCss(
    viewMode,
    participantsColumnWidth,
    actualSidebarWidth,
    sprintTimelineWorkingDays
  );

  const showAfterSprintRail = viewMode === 'full';

  return (
    <>
      <div
        className="sticky top-0 shrink-0 overflow-visible bg-white dark:bg-gray-800"
        data-planner-days-header
        style={{ width: rowWidth, minWidth: rowWidth, zIndex: ZIndex.stickyMainHeader }}
      >
        {/* Days row */}
        <div
          className="flex overflow-visible border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          style={{ height: DAYS_HEADER_ROW_HEIGHT_PX, minHeight: DAYS_HEADER_ROW_HEIGHT_PX }}
        >
          <div
            className="flex h-full min-h-0 min-w-0 shrink-0 overflow-visible"
            style={{ width: contentWidth, minWidth: contentWidth }}
          >
            <div
              className="relative flex shrink-0 items-center justify-between gap-3 overflow-hidden border-r border-b border-gray-200 bg-gray-100 px-4 py-2 sticky left-0 dark:border-gray-600 dark:bg-gray-800"
              data-onboarding="lane"
              style={{
                width: participantsColumnWidth,
                minWidth: participantsColumnWidth,
                height: DAYS_HEADER_ROW_HEIGHT_PX,
                minHeight: DAYS_HEADER_ROW_HEIGHT_PX,
                /* Угол шапки выше дней и колонок исполнителей при скролле по обеим осям */
                zIndex: ZIndex.stickyMainHeader + 1,
              }}
            >
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {featureColumn.isFeatureLane
                    ? t('sprintPlanner.featureLanes.columnTitle')
                    : t('sprintPlanner.swimlane.columnTitle')}
                </span>
                {developersManagement && (featureColumn.isFeatureLane || developers.length > 0) && (
                  <Button
                    ref={settingsButtonRef}
                    className="!h-6 !w-6 !min-h-0 !min-w-0 shrink-0 !justify-center !rounded-md !p-0 hover:!bg-gray-200 dark:hover:!bg-gray-700"
                    title={
                      featureColumn.isFeatureLane
                        ? t('sprintPlanner.featureLanes.editRowsTitle')
                        : t('sprintPlanner.swimlane.editParticipantsTitle')
                    }
                    type="button"
                    variant="ghost"
                    onClick={handleSettingsClick}
                  >
                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" name="edit" />
                  </Button>
                )}
              </div>
            </div>
            <DaysRow
              containerWidth={containerWidth}
              errorDayDetails={errorDayDetails}
              errorDayIndices={errorDayIndices}
              holidayDayIndices={holidayDayIndices}
              sprintStartDate={sprintStartDate}
              variant="swimlanes"
              workingDaysCount={sprintTimelineWorkingDays}
            />
          </div>
          {showAfterSprintRail ? (
            <SprintPlannerTimelineFill
              className="min-w-0 flex-1 border-l border-gray-200 dark:border-gray-600"
              style={{
                height: DAYS_HEADER_ROW_HEIGHT_PX,
                minHeight: DAYS_HEADER_ROW_HEIGHT_PX,
              }}
            />
          ) : null}
        </div>
      </div>

    {featureColumn.isFeatureLane && developersManagement && (
      <FeatureRowsSettingsPopup
        developersManagement={developersManagement}
        isOpen={isPopupOpen}
        position={popupPosition}
        onAddRow={(name) => featureColumn.onAddFeatureRow?.(name)}
        onClose={() => setIsPopupOpen(false)}
        onRemoveDraft={(rowId) => featureColumn.removeFeatureRow?.(rowId)}
      />
    )}
    {!featureColumn.isFeatureLane && developersManagement && developers.length > 0 && (
      <ParticipantsSettingsPopup
        boardId={boardId}
        developers={developers}
        developersManagement={developersManagement}
        isOpen={isPopupOpen}
        position={popupPosition}
        onClose={() => setIsPopupOpen(false)}
        onRemoveParticipant={removeParticipantFromTeam}
      />
    )}
    </>
  );
}
