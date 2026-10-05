'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { Developer } from '@/types';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { WORKING_DAYS } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_TOOLBAR_ITEM_IDLE } from '@/features/context-menu/contextMenuClasses';
import { sprintPlannerSwimlaneTimelineWidthCss } from '@/features/sprint/components/SprintPlanner/layout/sprintPlannerSwimlaneLayoutWidths';
import { SprintPlannerTimelineFill } from '@/features/sprint/components/SprintPlanner/layout/SprintPlannerTimelineFill';
import { usePlannerChromeSlot } from '@/features/sprint/components/SprintPlanner/plannerChromeSlot';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

import { DaysRow } from './DaysHeader/components/DaysRow';
import { FeatureRowsSettingsPopup } from './DaysHeader/components/FeatureRowsSettingsPopup';
import { ParticipantsSettingsPopup } from './DaysHeader/components/ParticipantsSettingsPopup';

/** Высота шапки дат / левой колонки свимлейна — как в занятости (40 + 1px бордер). */
export const DAYS_HEADER_ROW_HEIGHT_PX = 41;

function canLinkDaysScrollTimeline(): boolean {
  return typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('animation-timeline', 'scroll()');
}

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
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
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
  scrollContainerRef,
}: DaysHeaderProps) {
  const { t } = useI18n();
  const featureColumn = useFeatureLaneColumnUi();
  const actualSidebarWidth = sidebarOpen ? sidebarWidth : 0;

  const chromeSlot = usePlannerChromeSlot();
  const daysTrackRef = useRef<HTMLDivElement>(null);
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

  const containerWidth = sprintPlannerSwimlaneTimelineWidthCss(
    viewMode,
    participantsColumnWidth,
    actualSidebarWidth,
    sprintTimelineWorkingDays
  );

  const showAfterSprintRail = viewMode === 'full';

  useLayoutEffect(() => {
    if (!chromeSlot) return undefined;
    let cancelled = false;
    let cleanup = () => {};
    let attempts = 0;

    const bind = () => {
      if (cancelled) return;
      const scroller = scrollContainerRef?.current;
      const track = daysTrackRef.current;
      if (!scroller || !track) {
        attempts += 1;
        if (attempts < 60) requestAnimationFrame(bind);
        return;
      }
      // Диапазон задаём до класса анимации и держим равным max scrollLeft.
      // Слушатель scroll обновляет шапку на кадр позже колонок.
      const linked = canLinkDaysScrollTimeline();
      const applyMetrics = () => {
        const span = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        track.style.width = `${Math.max(scroller.scrollWidth - participantsColumnWidth, 0)}px`;
        track.style.setProperty('--planner-days-scroll-span', `${span}px`);
        if (!linked) {
          track.style.transform = `translate3d(${-scroller.scrollLeft}px, 0, 0)`;
        }
      };
      applyMetrics();
      track.classList.toggle('planner-days-scroll-track', linked);
      if (linked) {
        track.style.transform = '';
      } else {
        scroller.addEventListener('scroll', applyMetrics, { passive: true });
      }
      const observer = new ResizeObserver(applyMetrics);
      observer.observe(scroller);
      const content = scroller.firstElementChild;
      if (content) observer.observe(content);
      cleanup = () => {
        scroller.removeEventListener('scroll', applyMetrics);
        observer.disconnect();
      };
    };

    bind();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [chromeSlot, participantsColumnWidth, scrollContainerRef]);

  const daysRow = (
        <div
          className="flex overflow-hidden border-b border-gray-200 dark:border-gray-700"
          data-planner-days-header
          style={{ height: DAYS_HEADER_ROW_HEIGHT_PX, minHeight: DAYS_HEADER_ROW_HEIGHT_PX }}
        >
            <div
              className="relative flex shrink-0 items-center justify-between gap-3 overflow-hidden border-r border-gray-200 py-2 pl-4 pr-2 dark:border-r-gray-600"
              data-onboarding="lane"
              style={{
                width: participantsColumnWidth,
                minWidth: participantsColumnWidth,
                height: DAYS_HEADER_ROW_HEIGHT_PX,
                minHeight: DAYS_HEADER_ROW_HEIGHT_PX,
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
                    aria-label={
                      featureColumn.isFeatureLane
                        ? t('sprintPlanner.featureLanes.editRowsTitle')
                        : t('sprintPlanner.swimlane.editParticipantsTitle')
                    }
                    className={`!h-6 !w-6 !min-h-0 !min-w-0 shrink-0 !justify-center !rounded-md !p-0 ${FLOATING_TOOLBAR_ITEM_IDLE}`}
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
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div ref={daysTrackRef} className="flex h-full will-change-transform">
                <DaysRow
                  containerWidth={containerWidth}
                  errorDayDetails={errorDayDetails}
                  errorDayIndices={errorDayIndices}
                  holidayDayIndices={holidayDayIndices}
                  sprintStartDate={sprintStartDate}
                  variant="swimlanes"
                  workingDaysCount={sprintTimelineWorkingDays}
                />
                {showAfterSprintRail ? (
                  <SprintPlannerTimelineFill
                    className="min-w-0 flex-1 !bg-transparent"
                    style={{
                      height: DAYS_HEADER_ROW_HEIGHT_PX,
                      minHeight: DAYS_HEADER_ROW_HEIGHT_PX,
                    }}
                  />
                ) : null}
              </div>
            </div>
        </div>
  );

  return (
    <>
      {chromeSlot ? createPortal(daysRow, chromeSlot) : null}

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
