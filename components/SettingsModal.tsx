'use client';

import type { SprintTab } from '@/components/PageHeader';
import type { PlanningGanttTab } from '@/components/SettingsModal/tabs/SettingsPlanningTab.types';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { AppVersionLabel } from '@/components/AppVersionLabel';
import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { SettingsChangelogPanel } from '@/components/SettingsModal/SettingsChangelogPanel';
import { getSettingsTabsForPage } from '@/components/settingsModalPageContext';
import { ZIndex } from '@/constants';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import {
  useDataSyncAssigneesStorage,
  useDataSyncEstimatesStorage,
  useKanbanGroupByStorage,
  useLinksDimOnHoverStorage,
  useShowHolidaysStorage,
  useSidebarTabsSettingsStorage,
  useSwimlaneFactTimelineVisibleStorage,
  useSwimlaneLinksVisibilityStorage,
  useTrackerTokenStorage,
  useBoardViewModeStorage,
} from '@/hooks/useLocalStorage';
import { useOrgHolidayCountry } from '@/hooks/useOrgHolidayCountry';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { getAppVersionLabel } from '@/lib/appVersion';
import { validateToken } from '@/lib/beerTrackerApi';
import {
  issueTrackerShowsSettingsTokenTab,
  translateIssueTrackerProviderMessage,
} from '@/lib/issueTrackerProvider/issueTrackerUi';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';
import { readTrackerTokenPayload } from '@/lib/trackerTokenStorage';

import { SettingsGeneralTab } from './SettingsModal/tabs/SettingsGeneralTab';
import { SettingsPlanningTab } from './SettingsModal/tabs/SettingsPlanningTab';
import { SettingsYTrackerTab } from './SettingsModal/tabs/SettingsYTrackerTab';

type SettingsTab = 'general' | 'planning' | 'ytracker';

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
  const { holidayCountry, setHolidayCountry } = useOrgHolidayCountry();
  const [kanbanGroupBy, setKanbanGroupBy] = useKanbanGroupByStorage();
  const [swimlaneFactTimelineVisible, setSwimlaneFactTimelineVisible] =
    useSwimlaneFactTimelineVisibleStorage();
  const [swimlaneLinksVisible, setSwimlaneLinksVisible] = useSwimlaneLinksVisibilityStorage();
  const [linksDimOnHover, setLinksDimOnHover] = useLinksDimOnHoverStorage();
  const [sidebarTabsSettings, setSidebarTabsSettings] = useSidebarTabsSettingsStorage();
  const [boardViewMode] = useBoardViewModeStorage();

  const [ganttTab, setGanttTab] = useState<PlanningGanttTab>('swimlane');
  const [activeTab, setActiveTab] = useState<SettingsTab>('planning');
  const [showChangelog, setShowChangelog] = useState(false);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [localToken, setLocalToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setShowChangelog(false);
    }
  }

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
      const stored = readTrackerTokenPayload();
      const result = await validateToken(localToken, {
        cloudId: stored.cloudId,
        organizationId,
      });
      if (!result.valid) {
        setError(result.error || t('settings.token.invalid'));
        setIsValidating(false);
        return;
      }
      setToken(localToken.trim(), organizationId, {
        cloudId: stored.cloudId,
        expiresAt: stored.expiresAt,
        refreshToken: stored.refreshToken,
      });
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

  const showTrackerTokenTab = issueTrackerShowsSettingsTokenTab(issueTrackerProviderKind);
  const mainTabs: { id: SettingsTab; label: string; icon: 'calendar' | 'diagram' | 'link' | 'settings' }[] = [
    { id: 'planning', label: t('settings.tabs.planning'), icon: 'diagram' },
    ...(showTrackerTokenTab
      ? ([
          {
            id: 'ytracker',
            label: translateIssueTrackerProviderMessage(
              t,
              issueTrackerProviderKind,
              'settings.tabs.tracker'
            ),
            icon: 'link',
          },
        ] as const)
      : []),
    { id: 'general', label: t('settings.tabs.general'), icon: 'settings' },
  ];

  const content = (
    <div
      className={`fixed inset-0 flex cursor-pointer items-center justify-center bg-black/40 dark:bg-black/60 ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={handleCancel}
    >
      <div
        className={`mx-4 flex max-h-[90vh] w-full max-w-2xl cursor-default flex-col overflow-hidden rounded-lg border border-ds-border-subtle bg-white shadow-xl dark:bg-gray-800 ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        onClick={(e) => e.stopPropagation()}
      >
        {showChangelog ? (
          <SettingsChangelogPanel onBack={() => setShowChangelog(false)} onClose={handleCancel} />
        ) : (
          <>
            <div className="flex flex-shrink-0 items-center justify-between px-5 pb-1 pt-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
              <HeaderIconButton aria-label={t('settings.accessibility.closeSettings')} type="button" onClick={handleCancel}>
                <Icon className="h-5 w-5" name="close" />
              </HeaderIconButton>
            </div>

            <div className="flex flex-shrink-0 gap-1 px-3 pb-1 pt-1" role="tablist">
              {mainTabs.map(({ id, label, icon }) => {
                const isOn = activeTab === id;
                return (
                  <Button
                    key={id}
                    aria-selected={isOn}
                    className={`h-8 min-h-0 gap-1.5 !rounded-md !border-0 !px-2.5 !py-0 text-sm font-medium shadow-none ${
                      isOn
                        ? '!bg-ds-canvas !text-blue-600 hover:!bg-gray-100 active:!bg-gray-200 dark:!bg-white/10 dark:!text-blue-300 dark:hover:!bg-white/15 dark:active:!bg-white/20'
                        : '!bg-transparent !text-ds-text-muted hover:!bg-black/[0.05] hover:!text-gray-900 active:!bg-black/10 dark:hover:!bg-white/10 dark:hover:!text-gray-100 dark:active:!bg-white/15'
                    }`}
                    role="tab"
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab(id)}
                  >
                    <Icon className="h-4 w-4 shrink-0" name={icon} />
                    {label}
                  </Button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-5 py-4">
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

                {activeTab === 'ytracker' && showTrackerTokenTab ? (
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
                ) : null}

                {activeTab === 'planning' && (
                  <SettingsPlanningTab
                    ganttTab={ganttTab}
                    kanbanGroupBy={kanbanGroupBy}
                    linksDimOnHover={linksDimOnHover}
                    setGanttTab={setGanttTab}
                    setKanbanGroupBy={setKanbanGroupBy}
                    setLinksDimOnHover={setLinksDimOnHover}
                    setSwimlaneFactTimelineVisible={setSwimlaneFactTimelineVisible}
                    setSwimlaneLinksVisible={setSwimlaneLinksVisible}
                    swimlaneFactTimelineVisible={swimlaneFactTimelineVisible}
                    swimlaneLinksVisible={swimlaneLinksVisible}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center px-5 pb-2.5 pt-1">
              <Button
                aria-label={t('settings.changelog.open', { version: getAppVersionLabel() })}
                className="!h-auto !min-h-0 !rounded-md !px-1.5 !py-0.5 !text-xs !font-normal !text-ds-text-muted hover:!text-gray-900 focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-blue-500 focus-visible:!ring-offset-2 dark:hover:!bg-white/10 dark:hover:!text-gray-100 dark:focus-visible:!ring-blue-400 dark:focus-visible:!ring-offset-gray-800"
                type="button"
                variant="ghost"
                onClick={() => setShowChangelog(true)}
              >
                {t('settings.generalTab.versionLabel')}{' '}
                <AppVersionLabel className="!text-inherit text-xs" embedded />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
