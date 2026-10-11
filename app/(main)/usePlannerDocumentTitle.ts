'use client';

import { useEffect } from 'react';

import { isPlannerDocumentTitleRoute, resolvePlannerDocumentTitle } from '@/lib/documentTitle';

/**
 * Next.js после перехода на `/planner/:board/sprint/:sprint` (и при смене `?tab=`)
 * заново пишет в `<title>` статическое «Спринты» из generateMetadata.
 * Пока открыт планер, держим заголовок спринта и команды, а на бэклоге — «Бэклог».
 */
export function usePlannerDocumentTitle(params: {
  backlogTitle: string;
  boardLabel?: string | null;
  sprintName: string | null;
  tab?: string | null;
}): void {
  const title = resolvePlannerDocumentTitle({
    backlogTitle: params.backlogTitle,
    boardLabel: params.boardLabel,
    sprintName: params.sprintName,
    tab: params.tab,
  });

  useEffect(() => {
    if (!title) return;

    const apply = () => {
      if (!isPlannerDocumentTitleRoute(window.location.pathname)) return;
      if (document.title !== title) document.title = title;
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [title]);
}
