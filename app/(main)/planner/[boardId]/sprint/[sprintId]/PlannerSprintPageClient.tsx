'use client';

import { use } from 'react';

import MainPageClient from '@/app/(main)/MainPageClient';

export default function PlannerSprintPageClient({
  params,
}: {
  params: Promise<{ boardId: string; sprintId: string }>;
}) {
  const { boardId: boardIdStr, sprintId: sprintIdStr } = use(params);
  const boardId = parseInt(boardIdStr, 10);
  const sprintId = parseInt(sprintIdStr, 10);

  if (Number.isNaN(boardId) || Number.isNaN(sprintId)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-600">
        Некорректная ссылка: укажите числовые id доски и спринта.
      </div>
    );
  }

  return <MainPageClient plannerBoardId={boardId} plannerSprintId={sprintId} />;
}
