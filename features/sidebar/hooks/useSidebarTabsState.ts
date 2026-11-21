'use client';

import type { SidebarTasksTab } from '@/types';

import { useSearchParams } from 'next/navigation';
import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

import { replaceUrlQuery } from '@/utils/replaceUrlQuery';

import { resolveHiddenSidebarTabFallback } from './useSidebarHeaderTabsHelpers';

export type SidebarMainTab =
  | 'goals'
  | 'history'
  | 'invalid'
  | 'metrics'
  | 'tasks';

interface UseSidebarTabsStateProps {
  hideTasksTab?: boolean;
}

function getMainTabFromSearchParams(
  searchParams: URLSearchParams
): SidebarMainTab {
  const tabParam = searchParams.get('sidebarTab');
  if (
    tabParam === 'goals' ||
    tabParam === 'history' ||
    tabParam === 'invalid' ||
    tabParam === 'metrics' ||
    tabParam === 'tasks'
  ) {
    return tabParam;
  }
  if (tabParam === 'dhi') {
    return 'metrics';
  }
  return 'tasks';
}

function getActiveTabFromSearchParams(
  searchParams: URLSearchParams
): SidebarTasksTab {
  const tabParam = searchParams.get('sidebarSubTab');
  if (tabParam === 'all' || tabParam === 'dev' || tabParam === 'qa') {
    return tabParam;
  }
  return 'all';
}

export function useSidebarTabsState({
  hideTasksTab = false,
}: UseSidebarTabsStateProps = {}) {
  const searchParams = useSearchParams();

  const getMainTabFromUrl = useCallback(
    () => getMainTabFromSearchParams(searchParams),
    [searchParams]
  );
  const getActiveTabFromUrl = useCallback(
    () => getActiveTabFromSearchParams(searchParams),
    [searchParams]
  );

  const [mainTab, setMainTabState] = useState<SidebarMainTab>(getMainTabFromUrl);
  const [activeTab, setActiveTabState] = useState<SidebarTasksTab>(
    getActiveTabFromUrl
  );
  const isUserChangingTabRef = useRef(false);

  useEffect(() => {
    const fallbackTab = resolveHiddenSidebarTabFallback({
      hideTasksTab,
      mainTab,
    });
    if (!fallbackTab) {
      return;
    }
    isUserChangingTabRef.current = true;
    replaceUrlQuery((params) => params.set('sidebarTab', fallbackTab));
    startTransition(() => setMainTabState(fallbackTab));
  }, [hideTasksTab, mainTab]);

  useEffect(() => {
    if (isUserChangingTabRef.current) {
      isUserChangingTabRef.current = false;
      return;
    }

    const mainTabFromUrl = getMainTabFromUrl();
    const activeTabFromUrl = getActiveTabFromUrl();

    startTransition(() => {
      if (mainTabFromUrl !== mainTab) {
        setMainTabState(mainTabFromUrl);
      }
      if (activeTabFromUrl !== activeTab) {
        setActiveTabState(activeTabFromUrl);
      }
    });
  }, [searchParams, getMainTabFromUrl, getActiveTabFromUrl, mainTab, activeTab]);

  const setMainTab = useCallback(
    (tab: SidebarMainTab) => {
      isUserChangingTabRef.current = true;
      setMainTabState(tab);
      replaceUrlQuery((params) => params.set('sidebarTab', tab));
    },
    []
  );

  const setActiveTab = useCallback(
    (tab: SidebarTasksTab) => {
      isUserChangingTabRef.current = true;
      setActiveTabState(tab);
      replaceUrlQuery((params) => params.set('sidebarSubTab', tab));
    },
    []
  );

  return {
    activeTab,
    mainTab,
    setActiveTab,
    setMainTab,
  };
}
