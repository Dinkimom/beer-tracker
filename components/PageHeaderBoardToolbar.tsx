'use client';

import type { SprintTab } from '@/components/PageHeader';

import { BeerTrackerLogoButton } from '@/components/BeerTrackerLogoButton';
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
        <BeerTrackerLogoButton />
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
