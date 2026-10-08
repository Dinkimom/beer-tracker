import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import {
  loadBoardParamsForRequest,
  parseBoardIdParam,
} from '@/lib/boards/boardParamsRouteHelpers';

/**
 * GET /api/boards/[boardId]
 * Параметры доски из issue tracker (колонки канбана и т.д.).
 * Результат кэшируется на сервере — колонки меняются редко.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId: boardIdRaw } = await params;
    const boardId = parseBoardIdParam(boardIdRaw);
    if (boardId === null) {
      return NextResponse.json(
        { error: 'boardId must be a positive number' },
        { status: 400 }
      );
    }

    const board = await loadBoardParamsForRequest(_request, boardId);
    return NextResponse.json(board);
  } catch (error) {
    return handleApiError(error, 'fetch board params from Tracker');
  }
}
