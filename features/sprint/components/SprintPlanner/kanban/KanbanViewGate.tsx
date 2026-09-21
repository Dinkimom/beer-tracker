'use client';

interface KanbanViewGateProps {
  boardId: number | null;
  children: React.ReactNode;
  error: unknown;
  hasBoard: boolean;
  isLoading: boolean;
  t: (key: string) => string;
}

export function KanbanViewGate({
  boardId,
  isLoading,
  error,
  hasBoard,
  t,
  children,
}: KanbanViewGateProps) {
  if (boardId === null || boardId <= 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        {t('sprintPlanner.kanban.selectBoard')}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        {t('sprintPlanner.kanban.loadingColumns')}
      </div>
    );
  }
  if (error || !hasBoard) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-600 dark:text-red-400 text-sm">
        {t('sprintPlanner.kanban.boardLoadError')}
      </div>
    );
  }
  return children;
}
