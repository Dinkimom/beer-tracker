/**
 * Хук для обработчиков сайдбара в SprintPlanner
 */

import { useCallback } from 'react';

interface UseSprintPlannerSidebarHandlersProps {
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export function useSprintPlannerSidebarHandlers({
  setSidebarOpen,
}: UseSprintPlannerSidebarHandlersProps) {
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, [setSidebarOpen]);

  return {
    handleCloseSidebar,
    handleToggleSidebar,
  };
}

