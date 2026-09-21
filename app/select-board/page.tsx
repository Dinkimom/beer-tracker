'use client';

import type { SprintListItem } from '@/types/tracker';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { boardSelectorLabel } from '@/features/board/boardSelectorLabel';
import { invalidateBoardsQuery } from '@/features/board/boardsQuery';
import { useBoards } from '@/features/board/hooks/useBoards';
import { useSelectedBoardStorage, useSelectedSprintStorage } from '@/hooks/useLocalStorage';
import { fetchSprints } from '@/lib/beerTrackerApi';
import { buildPlannerPath } from '@/lib/planner/plannerUrl';

function pickDefaultSprint(sprints: SprintListItem[]): SprintListItem | null {
  const activeSprint = sprints.find((s) => s.status === 'in_progress' && !s.archived);
  return activeSprint ?? (sprints.length > 0 ? sprints[0]! : null);
}

function plannerUrlAfterBoardSelect(boardId: number, sprint: SprintListItem | null): string {
  if (sprint) {
    return `${buildPlannerPath(boardId, sprint.id)}?page=sprints&tab=board`;
  }
  return '/';
}

export default function SelectBoardPage() {
  const { language, t } = useI18n();
  const collatorLocale = language === 'en' ? 'en' : 'ru';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { boards, isLoading: boardsLoading } = useBoards();
  const [selectedBoardId, setSelectedBoardId] = useSelectedBoardStorage();
  const [, setSelectedSprintId] = useSelectedSprintStorage();
  /** Доска, по которой идёт запрос спринтов (не путать с selectedBoardId из хранилища до завершения). */
  const [loadingBoardId, setLoadingBoardId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectBoard = async (boardId: number) => {
    try {
      setLoadingBoardId(boardId);
      setError(null);

      // Загружаем спринты для выбранной доски
      const sprintsData: SprintListItem[] = await fetchSprints(boardId);
      const sprintToSelect = pickDefaultSprint(sprintsData);

      // Сохраняем доску
      setSelectedBoardId(boardId);

      // Сохраняем спринт, если он найден
      if (sprintToSelect) {
        setSelectedSprintId(sprintToSelect.id);
      } else {
        setSelectedSprintId(null);
      }

      router.push(plannerUrlAfterBoardSelect(boardId, sprintToSelect));
    } catch (err) {
      console.error('Error loading sprints:', err);
      setError(err instanceof Error ? err.message : t('selectBoard.loadSprintsFailed'));
    } finally {
      setLoadingBoardId(null);
    }
  };

  let boardsPanel: ReactNode;
  if (boardsLoading) {
    boardsPanel = (
      <div className="flex items-center justify-center py-12">
        <svg
          className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  } else if (boards.length === 0) {
    boardsPanel = (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="max-w-md text-ds-text-muted">{t('selectBoard.emptyHint')}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void invalidateBoardsQuery(queryClient)}
        >
          {t('selectBoard.refreshList')}
        </Button>
      </div>
    );
  } else {
    boardsPanel = (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
        {[...boards]
          .sort((a, b) =>
            boardSelectorLabel(a).localeCompare(boardSelectorLabel(b), collatorLocale, { sensitivity: 'base' })
          )
          .map((board) => {
          const teamHeading = boardSelectorLabel(board);
          const showTrackerBoardName =
            board.name.trim() !== teamHeading.trim();
          const isSelected = board.id === selectedBoardId;
          const isThisBoardLoading = loadingBoardId === board.id;
          const isBusy = loadingBoardId !== null;
          const stateClasses = isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md dark:border-blue-400 dark:bg-blue-900/20'
            : 'border-ds-border-subtle bg-white hover:border-blue-300 hover:shadow-md dark:bg-gray-700/80 dark:hover:border-blue-600';
          const titleClasses = isSelected
            ? 'text-blue-900 dark:text-blue-100'
            : 'text-gray-900 dark:text-gray-100';
          const boardButtonClass = [
            'relative h-full min-h-0 w-full rounded-xl border-2 p-5 text-left transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-800',
            stateClasses,
            isThisBoardLoading ? 'opacity-75' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={board.team}
              aria-busy={isThisBoardLoading}
              aria-label={t('selectBoard.ariaTeamBoard', { team: teamHeading, id: board.id })}
              aria-pressed={isSelected}
              className={boardButtonClass}
              disabled={isBusy}
              type="button"
              onClick={() => handleSelectBoard(board.id)}
            >
              {isThisBoardLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[0.625rem] bg-white/80 dark:bg-gray-800/80">
                  <svg
                    className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              )}
              <h3 className={`break-words text-xl font-semibold ${titleClasses}`}>{teamHeading}</h3>
              {showTrackerBoardName ? (
                <p className="mt-1 text-sm text-ds-text-muted">
                  {t('selectBoard.trackerBoardLine', { name: board.name })}
                </p>
              ) : null}
              <p
                className="mt-2 font-mono text-xs text-ds-text-muted"
                title={t('selectBoard.boardIdTitle')}
              >
                {t('selectBoard.boardIdLabel', { id: board.id })}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-xl dark:bg-gray-800">
          <div className="px-8 pb-8 pt-6">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {t('selectBoard.heading')}
              </h1>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {boardsPanel}
          </div>
        </div>
      </div>
    </div>
  );
}

