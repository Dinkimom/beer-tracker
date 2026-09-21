'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';

import { useCallback, useEffect, useState } from 'react';

export function useOccupancyLinkingState({
  onAddLink,
}: {
  onAddLink?: (link: { fromTaskId: string; id: string; toTaskId: string }) => void;
}) {
  const [linkingFromTaskId, setLinkingFromTaskId] = useState<string | null>(null);

  const handleStartLinking = useCallback((taskId: string) => {
    setLinkingFromTaskId((prev) => (prev === taskId ? null : taskId));
  }, []);

  const handleCancelLinking = useCallback(() => {
    setLinkingFromTaskId(null);
  }, []);

  const handleCompleteLink = useCallback(
    (toTaskId: string) => {
      if (!linkingFromTaskId || linkingFromTaskId === toTaskId || !onAddLink) return;
      onAddLink({
        id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fromTaskId: linkingFromTaskId,
        toTaskId,
      });
      setLinkingFromTaskId(null);
    },
    [linkingFromTaskId, onAddLink]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLinkingFromTaskId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleTableClickCapture = useCallback(
    (e: ReactMouseEvent<HTMLTableElement>) => {
      const el = e.target as HTMLElement;
      if (
        linkingFromTaskId &&
        !el.closest('[data-occupancy-bar]') &&
        !el.closest('[data-occupancy-link-cancel]')
      ) {
        setLinkingFromTaskId(null);
      }
    },
    [linkingFromTaskId]
  );

  return {
    handleCancelLinking,
    handleCompleteLink,
    handleStartLinking,
    handleTableClickCapture,
    linkingFromTaskId,
  };
}
