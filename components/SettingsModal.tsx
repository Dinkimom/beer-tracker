'use client';

import type { SprintTab } from '@/components/PageHeader';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { AppVersionLabel } from '@/components/AppVersionLabel';
import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { getSettingsTabsForPage } from '@/components/settingsModalPageContext';
import { ZIndex } from '@/constants';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import {
  useDataSyncAssigneesStorage,
  useDataSyncEstimatesStorage,
  useEpicOccupancyRowFieldsStorage,
  useEpicOccupancyRowViewStorage,
  useEpicOccupancyTimelineSettingsStorage,
  useHolidayCountryStorage,
  useKanbanGroupByStorage,
  useLinksDimOnHoverStorage,
  useOccupancyRowFieldsStorage,
  useOccupancyRowViewStorage,
  useOccupancyTimelineScaleStorage,
  useOccupancyTimelineSettingsStorage,
  useQuarterlyV2OccupancyRowFieldsStorage,
  useQuarterlyV2OccupancyRowViewStorage,
  useQuarterlyV2OccupancyTimelineSettingsStorage,
  useQuarterlyV2ShowPlannedTasksStorage,
  useShowHolidaysStorage,
  useSidebarTabsSettingsStorage,
  useSwimlaneCalendarBusyVisibleStorage,
  useSwimlaneCardFieldsStorage,
  useSwimlaneFactTimelineVisibleStorage,
  useSwimlaneLinksVisibilityStorage,
  useTrackerTokenStorage,
  useBoardViewModeStorage,
} from '@/hooks/useLocalStorage';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { validateToken } from '@/lib/beerTrackerApi';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';
import { readTrackerTokenPayload } from '@/lib/trackerTokenStorage';

import { SettingsCalendarTab } from './SettingsModal/tabs/SettingsCalendarTab';
import { SettingsGeneralTab } from './SettingsModal/tabs/SettingsGeneralTab';
import { SettingsPlanningTab } from './SettingsModal/tabs/SettingsPlanningTab';
import { SettingsYTrackerTab } from './SettingsModal/tabs/SettingsYTrackerTab';

type SettingsTab = 'calendar' | 'general' | 'planning' | 'ytracker';

interface SettingsModalProps {
  /** Tab inside Sprints (from URL) */
  activeSprintTab: SprintTab;
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose, activeSprintTab }: SettingsModalProps) {
  const { t } = useI18n();
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const [token, setToken] = useTrackerTokenStorage();
  const [syncEstimates, setSyncEstimates] = useDataSyncEstimatesStorage();
  const [syncAssignees, setSyncAssignees] = useDataSyncAssigneesStorage();
  const [showHolidays, setShowHolidays] = useShowHolidaysStorage();
  const [holidayCountry, setHolidayCountry] = useHolidayCountryStorage();
  const [timelineSettings, setTimelineSettings] = useOccupancyTimelineSettingsStorage();
  const [occupancyTimelineScale, setOccupancyTimelineScale] = useOccupancyTimelineScaleStorage();
  const [occupancyRowView, setOccupancyRowView] = useOccupancyRowViewStorage();
  const [occupancyRowFields, setOccupancyRowFields] = useOccupancyRowFieldsStorage();
  const [kanbanGroupBy, setKanbanGroupBy] = useKanbanGroupByStorage();
  const [swimlaneFactTimelineVisible, setSwimlaneFactTimelineVisible] =
    useSwimlaneFactTimelineVisibleStorage();
  const [swimlaneCalendarBusyVisible, setSwimlaneCalendarBusyVisible] =
    useSwimlaneCalendarBusyVisibleStorage();
  const [swimlaneLinksVisible, setSwimlaneLinksVisible] = useSwimlaneLinksVisibilityStorage();
  const [linksDimOnHover, setLinksDimOnHover] = useLinksDimOnHoverStorage();
  const [epicOccupancyRowView, setEpicOccupancyRowView] = useEpicOccupancyRowViewStorage();
  const [epicTimelineSettings, setEpicTimelineSettings] = useEpicOccupancyTimelineSettingsStorage();
  const [epicOccupancyRowFields, setEpicOccupancyRowFields] = useEpicOccupancyRowFieldsStorage();
  const [quarterlyV2RowView, setQuarterlyV2RowView] = useQuarterlyV2OccupancyRowViewStorage();
  const [quarterlyV2TimelineSettings, setQuarterlyV2TimelineSettings] = useQuarterlyV2OccupancyTimelineSettingsStorage();
  const [quarterlyV2RowFields, setQuarterlyV2RowFields] = useQuarterlyV2OccupancyRowFieldsStorage();
  const [quarterlyV2ShowPlannedTasks, setQuarterlyV2ShowPlannedTasks] = useQuarterlyV2ShowPlannedTasksStorage();
  const [swimlaneCardFields, setSwimlaneCardFields] = useSwimlaneCardFieldsStorage();
  const [sidebarTabsSettings, setSidebarTabsSettings] = useSidebarTabsSettingsStorage();
  const [boardViewMode] = useBoardViewModeStorage();

  const [activeTab, setActiveTab] = useState<SettingsTab>('planning');
  const [ganttTab, setGanttTab] = useState<'epics' | 'kanban' | 'quarterly-v2' | 'sprint' | 'swimlane'>('swimlane');
  const [localToken, setLocalToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalToken(token);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const boardModeForContext =
      activeSprintTab === 'board' ? boardViewMode : null;
    const { mainTab, planningGanttTab } = getSettingsTabsForPage(
      activeSprintTab,
      boardModeForContext
    );
    setActiveTab(mainTab);
    setGanttTab(planningGanttTab);
  }, [isOpen, activeSprintTab, boardViewMode]);

  const overlay = useOverlayPresence(isOpen);

  const handleSave = async () => {
    if (!localToken.trim()) {
      setError(t('settings.token.empty'));
      return;
    }
    setIsValidating(true);
    setError('');
    try {
      const organizationId = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim();
      if (!organizationId) {
        setError(t('settings.token.selectOrganizationFirst'));
        setIsValidating(false);
        return;
      }
      const storedEmail = readTrackerTokenPayload().email;
      const result = await validateToken(localToken, {
        email: storedEmail,
        organizationId,
      });
      if (!result.valid) {
        setError(result.error || t('settings.token.invalid'));
        setIsValidating(false);
        return;
      }
      setToken(localToken.trim(), organizationId, storedEmail);
      setIsValidating(false);
      onClose();
    } catch (err) {
      console.error('Error validating token:', err);
      setError(t('settings.token.validationError'));
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    setLocalToken(token);
    setError('');
    onClose();
  };

  if (!overlay.mounted) return null;

  const mainTabs: { id: SettingsTab; label: string; icon: 'calendar' | 'diagram' | 'link' | 'settings' }[] = [
    { id: 'planning', label: t('settings.tabs.planning'), icon: 'diagram' },
    { id: 'calendar', label: t('settings.tabs.calendar'), icon: 'calendar' },
    {
      id: 'ytracker',
      label: translateIssueTrackerProviderMessage(
        t,
        issueTrackerProviderKind,
        'settings.tabs.tracker'
      ),
      icon: 'link',
    },
    { id: 'general', label: t('settings.tabs.general'), icon: 'settings' },
  ];

  const content = (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 cursor-pointer ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={handleCancel}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
          <HeaderIconButton aria-label={t('settings.accessibility.closeSettings')} title={t('settings.accessibility.close')} type="button" onClick={handleCancel}>
            <Icon className="h-5 w-5" name="close" />
          </HeaderIconButton>
        </div>

        <div
          className="flex gap-1 px-4 pt-2 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
          role="tablist"
        >
          {mainTabs.map(({ id, label, icon }) => {
            const isOn = activeTab === id;
            return (
              <Button
                key={id}
                aria-selected={isOn}
                className={`gap-2 px-4 py-2.5 text-sm font-medium shadow-none ${
                  isOn
                    ? '!bg-gray-200 !text-gray-900 hover:!bg-gray-200 dark:!bg-gray-600 dark:!text-gray-100 dark:hover:!bg-gray-600'
                    : '!text-gray-600 hover:!bg-gray-100 dark:!text-gray-400 dark:hover:!bg-gray-700/50 dark:hover:!text-gray-200'
                }`}
                role="tab"
                type="button"
                variant="ghost"
                onClick={() => setActiveTab(id)}
              >
                <Icon className="h-4 w-4" name={icon} />
                {label}
              </Button>
            );
          })}
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="px-6 py-5">
            {activeTab === 'general' && (
              <SettingsGeneralTab
                holidayCountry={holidayCountry}
                setHolidayCountry={setHolidayCountry}
                setShowHolidays={setShowHolidays}
                setSidebarTabsSettings={setSidebarTabsSettings}
                setSyncAssignees={setSyncAssignees}
                setSyncEstimates={setSyncEstimates}
                showHolidays={showHolidays}
                sidebarTabsSettings={sidebarTabsSettings}
                syncAssignees={syncAssignees}
                syncEstimates={syncEstimates}
              />
            )}

            {activeTab === 'ytracker' && (
              <SettingsYTrackerTab
                error={error}
                handleSave={handleSave}
                isValidating={isValidating}
                localToken={localToken}
                setError={setError}
                setLocalToken={setLocalToken}
                setShowToken={setShowToken}
                showToken={showToken}
                token={token}
              />
            )}

            {activeTab === 'calendar' && (
              <SettingsCalendarTab
                setSwimlaneCalendarBusyVisible={setSwimlaneCalendarBusyVisible}
                swimlaneCalendarBusyVisible={swimlaneCalendarBusyVisible}
              />
            )}

            {activeTab === 'planning' && (
              <SettingsPlanningTab
                epicOccupancyRowFields={epicOccupancyRowFields}
                epicOccupancyRowView={epicOccupancyRowView}
                epicTimelineSettings={epicTimelineSettings}
                ganttTab={ganttTab}
                kanbanGroupBy={kanbanGroupBy}
                linksDimOnHover={linksDimOnHover}
                occupancyRowFields={occupancyRowFields}
                occupancyRowView={occupancyRowView}
                occupancyTimelineScale={occupancyTimelineScale}
                quarterlyV2RowFields={quarterlyV2RowFields}
                quarterlyV2RowView={quarterlyV2RowView}
                quarterlyV2ShowPlannedTasks={quarterlyV2ShowPlannedTasks}
                quarterlyV2TimelineSettings={quarterlyV2TimelineSettings}
                setEpicOccupancyRowFields={setEpicOccupancyRowFields}
                setEpicOccupancyRowView={setEpicOccupancyRowView}
                setEpicTimelineSettings={setEpicTimelineSettings}
                setGanttTab={setGanttTab}
                setKanbanGroupBy={setKanbanGroupBy}
                setLinksDimOnHover={setLinksDimOnHover}
                setOccupancyRowFields={setOccupancyRowFields}
                setOccupancyRowView={setOccupancyRowView}
                setOccupancyTimelineScale={setOccupancyTimelineScale}
                setQuarterlyV2RowFields={setQuarterlyV2RowFields}
                setQuarterlyV2RowView={setQuarterlyV2RowView}
                setQuarterlyV2ShowPlannedTasks={setQuarterlyV2ShowPlannedTasks}
                setQuarterlyV2TimelineSettings={setQuarterlyV2TimelineSettings}
                setSwimlaneCalendarBusyVisible={setSwimlaneCalendarBusyVisible}
                setSwimlaneCardFields={setSwimlaneCardFields}
                setSwimlaneFactTimelineVisible={setSwimlaneFactTimelineVisible}
                setSwimlaneLinksVisible={setSwimlaneLinksVisible}
                setTimelineSettings={setTimelineSettings}
                swimlaneCalendarBusyVisible={swimlaneCalendarBusyVisible}
                swimlaneCardFields={swimlaneCardFields}
                swimlaneFactTimelineVisible={swimlaneFactTimelineVisible}
                swimlaneLinksVisible={swimlaneLinksVisible}
                timelineSettings={timelineSettings}
              />
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center border-t border-gray-200 px-6 py-2.5 dark:border-gray-700">
          <p className="text-xs text-ds-text-muted">
            {t('settings.generalTab.versionLabel')}{' '}
            <AppVersionLabel className="text-xs" />
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
