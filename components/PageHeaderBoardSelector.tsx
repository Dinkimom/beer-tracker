'use client';

import { BoardSelector } from '@/features/board/components/BoardSelector';

interface PageHeaderBoardSelectorProps {
  boardName?: string | null;
  selectedBoardId: number | null | undefined;
  onBoardChange?: (boardId: number | null) => void;
}

export function PageHeaderBoardSelector({
  selectedBoardId,
  boardName,
  onBoardChange,
}: PageHeaderBoardSelectorProps) {
  if (onBoardChange) {
    return <BoardSelector selectedBoardId={selectedBoardId ?? null} onBoardChange={onBoardChange} />;
  }
  if (!boardName) {
    return null;
  }
  return <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{boardName}</h1>;
}
