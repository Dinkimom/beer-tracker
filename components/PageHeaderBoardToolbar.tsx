'use client';

import type { BeerLottieRef } from '@/components/BeerLottie';
import type { SprintTab } from '@/components/PageHeader';
import type { RefObject } from 'react';

import { BeerLottie } from '@/components/BeerLottie';
import { Button } from '@/components/Button';
import { CurrentUserAvatar } from '@/components/CurrentUserAvatar';
import { PageHeaderActionButtons } from '@/components/PageHeaderActionButtons';
import { PageHeaderAdminLink } from '@/components/PageHeaderAdminLink';
import { PageHeaderBoardSelector } from '@/components/PageHeaderBoardSelector';
import {
  PageHeaderMainPageTabs,
  type PageHeaderMainPageTabItem,
} from '@/components/PageHeaderMainPageTabs';
import { useDemoPlannerShell } from '@/contexts/DemoPlannerShellContext';
import { useI18n } from '@/contexts/LanguageContext';
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell';

interface PageHeaderBoardToolbarProps {
  activeTab: SprintTab;
  adminHref?: string | null;
  beerLottieRef: RefObject<BeerLottieRef | null>;
  boardName?: string | null;
  christmasThemeEnabled: boolean;
  isChristmasPeriod: boolean;
  selectedBoardId: number | null | undefined;
  sprintTabs: Array<PageHeaderMainPageTabItem<SprintTab>>;
  theme: 'dark' | 'light';
  onBoardChange?: (boardId: number | null) => void;
  onChristmasThemeToggle: () => void;
  onSettingsOpen: () => void;
  onTabChange?: (tab: SprintTab) => void;
  onThemeToggle: () => void;
}

export function PageHeaderBoardToolbar({
  activeTab,
  adminHref,
  beerLottieRef,
  boardName,
  christmasThemeEnabled,
  isChristmasPeriod,
  selectedBoardId,
  sprintTabs,
  theme,
  onBoardChange,
  onChristmasThemeToggle,
  onSettingsOpen,
  onTabChange,
  onThemeToggle,
}: PageHeaderBoardToolbarProps) {
  const { isDemoPlanner } = useDemoPlannerShell();
  const { t } = useI18n();
  const showUserCluster = !isDemoPlanner;

  return (
    <div className="flex items-center justify-between gap-4 px-4 pb-1 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Button
          aria-label={t('header.clickForAnimation')}
          className="h-auto min-h-0 gap-1 border-0 bg-transparent p-0 pr-2 text-left shadow-none hover:bg-transparent dark:hover:bg-transparent"
          type="button"
          variant="ghost"
          onClick={() => beerLottieRef.current?.play()}
        >
          <BeerLottie ref={beerLottieRef} />
          <span
            className="whitespace-nowrap text-2xl font-bold text-gray-900 dark:text-gray-100"
            style={{
              fontFamily: 'var(--font-caveat), cursive',
              fontWeight: 700,
              letterSpacing: '0.02em',
              transform: 'rotate(-1deg)',
            }}
          >
            {t('header.appName')}
          </span>
        </Button>
        <PageHeaderBoardSelector
          boardName={boardName}
          selectedBoardId={selectedBoardId}
          onBoardChange={onBoardChange}
        />
        <PageHeaderMainPageTabs
          activeId={activeTab}
          ariaLabel={t('header.accessibility.sprintTabsNavigation')}
          items={sprintTabs}
          onChange={(tab) => onTabChange?.(tab)}
        />
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <PageHeaderActionButtons
          christmasThemeEnabled={christmasThemeEnabled}
          isChristmasPeriod={isChristmasPeriod}
          theme={theme}
          onChristmasThemeToggle={onChristmasThemeToggle}
          onSettingsOpen={onSettingsOpen}
          onThemeToggle={onThemeToggle}
        />
        {adminHref ? <PageHeaderAdminLink adminHref={adminHref} /> : null}
        {showUserCluster ? (
          <div className="flex items-center gap-2">
            <CurrentUserAvatar />
            <NotificationsBell />
          </div>
        ) : null}
      </div>
    </div>
  );
}
