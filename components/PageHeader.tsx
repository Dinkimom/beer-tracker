'use client';

import type { BeerLottieRef } from '@/components/BeerLottie';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';

import { ChristmasLights, isInChristmasPeriod } from '@/components/ChristmasLights';
import { useI18n } from '@/contexts/LanguageContext';
import { useChristmasThemeStorage, useThemeStorage } from '@/hooks/useLocalStorage';

import { PageHeaderBoardToolbar } from './PageHeaderBoardToolbar';

const SettingsModal = dynamic(
  () => import('@/components/SettingsModal').then((mod) => mod.SettingsModal),
  { ssr: false }
);

export type SprintTab = 'backlog' | 'board' | 'burndown';

function buildSprintTabItems(t: (key: string) => string): Array<{ id: SprintTab; label: string }> {
  return [
    { id: 'backlog', label: t('header.sprintTabs.backlog') },
    { id: 'board', label: t('header.sprintTabs.board') },
    { id: 'burndown', label: t('header.sprintTabs.burndown') },
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
  const beerLottieRef = useRef<BeerLottieRef>(null);

  const sprintTabs = useMemo(() => buildSprintTabItems(t), [t]);

  const showChristmasLights = isChristmasPeriod && christmasThemeEnabled;
  const showBoardToolbar = selectedBoardId !== undefined;

  return (
    <div className="relative bg-ds-surface-header" data-page-header>
      {showChristmasLights ? <ChristmasLights /> : null}
      {showBoardToolbar ? (
        <PageHeaderBoardToolbar
          activeTab={activeTab}
          adminHref={adminHref}
          beerLottieRef={beerLottieRef}
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
