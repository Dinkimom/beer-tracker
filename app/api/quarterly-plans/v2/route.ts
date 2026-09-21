import type { StoryPhasesByStory } from '@/features/quarterly-planning-v2/types';
import type { Quarter } from '@/types/quarterly';

import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { getTrackerApiFromRequest } from '@/lib/api-tracker';
import {
  buildFilteredStoryPhasesForSprint,
  ensureQuarterlyPlanId,
  ensureQuarterlyPlanV2Tables,
  listQuarterlyPlanV2Epics,
  listQuarterlyPlanV2ExcludedStories,
  listQuarterlyPlanV2StoryEvents,
  listQuarterlyPlanV2StoryPhases,
  resolveQuarterlyPlanIdForPut,
  rowsToStoryEventsByStory,
  rowsToStoryPhasesByStory,
  saveQuarterlyPlanV2InTransaction,
} from '@/lib/quarterlyPlans';

/**
 * GET /api/quarterly-plans/v2?boardId=&year=&quarter=
 * Загрузить план v2: эпики и фазы стори. При отсутствии записи в quarterly_plans создаём её.
 * Опционально: &parentKeys=KEY1,KEY2,&sprintId= — вернуть фазы только для этих родительских тикетов в указанном спринте (эпики агрегируются из стори).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');
    const year = searchParams.get('year');
    const quarter = searchParams.get('quarter');
    const parentKeysParam = searchParams.get('parentKeys');
    const sprintIdParam = searchParams.get('sprintId');

    if (!boardId || !year || !quarter) {
      return NextResponse.json(
        { error: 'boardId, year и quarter обязательны' },
        { status: 400 }
      );
    }

    const boardIdNum = parseInt(boardId, 10);
    const yearNum = parseInt(year, 10);
    const quarterNum = parseInt(quarter, 10);
    if (Number.isNaN(boardIdNum) || Number.isNaN(yearNum) || Number.isNaN(quarterNum)) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }

    const planId = await ensureQuarterlyPlanId(boardIdNum, yearNum, quarterNum);
    await ensureQuarterlyPlanV2Tables();

    const epicsResult = await listQuarterlyPlanV2Epics(planId);
    const phasesResult = await listQuarterlyPlanV2StoryPhases(planId);
    const excludedStoryKeys = await listQuarterlyPlanV2ExcludedStories(planId);
    const eventsResult = await listQuarterlyPlanV2StoryEvents(planId);

    const epicKeys = epicsResult.map((r) => r.epic_key);

    const allStoryPhases: StoryPhasesByStory = rowsToStoryPhasesByStory(
      phasesResult as Parameters<typeof rowsToStoryPhasesByStory>[0]
    );

    const storyEvents = rowsToStoryEventsByStory(
      eventsResult as Parameters<typeof rowsToStoryEventsByStory>[0]
    );

    let storyPhases: StoryPhasesByStory = allStoryPhases;
    let releaseInSprintKeysResult: string[] | undefined;

    const trackerApi = await getTrackerApiFromRequest(request);
    const { data: allSprintsFromTracker } = await trackerApi.get<
      Array<{ endDate: string; id: number; name?: string; startDate: string }>
    >(`/boards/${boardIdNum}/sprints`);
    const allSprintsForQuarter = allSprintsFromTracker ?? [];

    if (parentKeysParam?.trim() && sprintIdParam != null && sprintIdParam !== '') {
      const parentKeys = parentKeysParam
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      const sprintIdNum = parseInt(sprintIdParam, 10);
      if (parentKeys.length > 0 && !Number.isNaN(sprintIdNum)) {
        const filtered = await buildFilteredStoryPhasesForSprint(
          parentKeys,
          sprintIdNum,
          boardIdNum,
          yearNum,
          quarterNum as Quarter,
          allStoryPhases,
          epicKeys,
          allSprintsForQuarter,
          request
        );
        storyPhases = filtered.storyPhases;
        releaseInSprintKeysResult = filtered.releaseInSprintKeys;
      }
    }

    const json: {
      epicKeys: string[];
      excludedStoryKeys: string[];
      planId: string;
      releaseInSprintKeys?: string[];
      storyEvents: typeof storyEvents;
      storyPhases: StoryPhasesByStory;
    } = {
      planId,
      epicKeys,
      excludedStoryKeys,
      storyPhases,
      storyEvents,
    };
    if (releaseInSprintKeysResult) json.releaseInSprintKeys = releaseInSprintKeysResult;
    return NextResponse.json(json);
  } catch (error) {
    return handleApiError(error, 'load quarterly plan v2');
  }
}

/**
 * PUT /api/quarterly-plans/v2
 * Body: { boardId: number, year: number, quarter: number, epicKeys: string[], storyPhases: Record<string, { sprintIndex, startDay, durationDays }> }
 * Сохранить план v2.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, year, quarter, epicKeys, storyPhases, storyEvents, excludedStoryKeys } =
      body;

    if (boardId == null || year == null || quarter == null) {
      return NextResponse.json(
        { error: 'boardId, year и quarter обязательны' },
        { status: 400 }
      );
    }

    const boardIdNum = Number(boardId);
    const yearNum = Number(year);
    const quarterNum = Number(quarter);
    if (Number.isNaN(boardIdNum) || Number.isNaN(yearNum) || Number.isNaN(quarterNum)) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }

    const planId = await resolveQuarterlyPlanIdForPut(boardIdNum, yearNum, quarterNum);

    await saveQuarterlyPlanV2InTransaction({
      planId,
      epicKeys: Array.isArray(epicKeys) ? (epicKeys as string[]) : [],
      storyPhases,
      storyEvents,
      excludedStoryKeys: Array.isArray(excludedStoryKeys) ? (excludedStoryKeys as string[]) : [],
    });

    return NextResponse.json({ success: true, planId });
  } catch (error) {
    return handleApiError(error, 'save quarterly plan v2');
  }
}
