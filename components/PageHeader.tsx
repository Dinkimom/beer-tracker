'use client';

import type { PageHeaderMainPageTabItem } from './PageHeaderMainPageTabs';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

import { ChristmasLights } from '@/components/ChristmasLights';
import { isInChristmasPeriod } from '@/components/christmasLightsHelpers';
import { useI18n } from '@/contexts/LanguageContext';
import { useChristmasThemeStorage, useThemeStorage } from '@/hooks/useLocalStorage';

import { PageHeaderBoardToolbar } from './PageHeaderBoardToolbar';

const SettingsModal = dynamic(
  () => import('@/components/SettingsModal').then((mod) => mod.SettingsModal),
  { ssr: false }
);

export type SprintTab = 'backlog' | 'board' | 'burndown' | 'metrics' | 'retro';

function buildSprintTabItems(t: (key: string) => string): Array<PageHeaderMainPageTabItem<SprintTab>> {
  return [
    { id: 'backlog', icon: 'backlog', label: t('header.sprintTabs.backlog') },
    { id: 'board', icon: 'timeline', label: t('header.sprintTabs.board') },
    {
      id: 'burndown',
      icon: 'trend-down',
      label: t('header.sprintTabs.burndown'),
      shortLabel: t('header.sprintTabs.burndownShort'),
    },
    { id: 'retro', icon: 'comment', label: t('header.sprintTabs.retro') },
    { id: 'metrics', icon: 'bar-chart', label: t('header.sprintTabs.metrics') },
  ];
}

interface PageHeaderProps {
  activeTab: SprintTab;
  adminHref?: string | null;
  boardName?: string | null;
  selectedBoardId?: number | null;
  onBoardChange?: (boardId: number | null) => void;
  onTabChange?: (tab: SprintTab) => void;
}

export function PageHeader({
  activeTab,
  adminHref,
  boardName,
  selectedBoardId,
  onBoardChange,
  onTabChange,
}: PageHeaderProps) {
  const { t } = useI18n();
  const [theme, setTheme] = useThemeStorage();
  const [christmasThemeEnabled, setChristmasThemeEnabled] = useChristmasThemeStorage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsRequested, setSettingsRequested] = useState(false);
  const isChristmasPeriod = isInChristmasPeriod();

  const sprintTabs = useMemo(() => buildSprintTabItems(t), [t]);

  const showChristmasLights = isChristmasPeriod && christmasThemeEnabled;
  const showBoardToolbar = selectedBoardId !== undefined;

  return (
    <div className="relative shrink-0 bg-ds-canvas" data-page-header>
      {showChristmasLights ? <ChristmasLights /> : null}
      {showBoardToolbar ? (
        <PageHeaderBoardToolbar
          activeTab={activeTab}
          adminHref={adminHref}
          boardName={boardName}
          christmasThemeEnabled={christmasThemeEnabled}
          isChristmasPeriod={isChristmasPeriod}
          selectedBoardId={selectedBoardId}
          sprintTabs={sprintTabs}
          theme={theme}
          onBoardChange={onBoardChange}
          onChristmasThemeToggle={() => setChristmasThemeEnabled(!christmasThemeEnabled)}
          onSettingsOpen={() => {
            setSettingsRequested(true);
            setIsSettingsOpen(true);
          }}
          onTabChange={onTabChange}
          onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        />
      ) : null}
      {settingsRequested ? (
        <SettingsModal
          activeSprintTab={activeTab}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
