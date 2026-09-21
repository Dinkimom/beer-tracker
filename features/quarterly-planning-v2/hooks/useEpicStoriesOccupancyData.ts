'use client';

import type { QuarterlySprintInfo, StoryPhasesByStory } from '../types';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchParentStatusesAndTypes } from '@/features/sprint/components/SprintPlanner/occupancy/hooks/useParentStatuses';

import { buildQuarterSprintTimeline } from '../utils/quarterSprints';

import {
  buildEpicTaskRows,
  buildStoryPhaseTaskRow,
} from './useEpicStoriesOccupancyDataHelpers';

/** Данные по эпику для построения строк (имя, статус, тип, приоритет). */
export interface EpicDetails {
  epicKey: string;
  epicName: string;
  epicOriginalStatus?: string;
  epicPriority?: string;
  epicType?: string;
}

interface UseEpicStoriesOccupancyDataParams {
  /** Данные по каждому эпику (имя, статус, тип, приоритет) — по epicKey */
  epicDetailsMap: Map<string, EpicDetails>;
  /** Стори, убранные из плана вручную (эпик остаётся) */
  excludedStoryKeys?: string[];
  /** Все эпики из плана — по каждому загружаются стори и строятся строки таймлайна */
  planEpicKeys: string[];
  quarter: 1 | 2 | 3 | 4;
  sprints: SprintListItem[];
  storyPhases: StoryPhasesByStory;
  year: number;
}

interface UseEpicStoriesOccupancyDataResult {
  isLoading: boolean;
  sprintInfos: QuarterlySprintInfo[];
  storyPhasesByStory: StoryPhasesByStory;
  tasks: Task[];
}

/**
 * Данные для отображения занятости эпика по стори (эпик = группа, стори = строки с фазами).
 * Стори загружаются через usePlanEpicsWithStories; позиции берутся из storyPhases.
 */
export function useEpicStoriesOccupancyData({
  epicDetailsMap,
  planEpicKeys,
  excludedStoryKeys = [],
  quarter,
  sprints,
  storyPhases,
  year,
}: UseEpicStoriesOccupancyDataParams): UseEpicStoriesOccupancyDataResult {
  const excludedStoryKeysSet = useMemo(
    () => new Set(excludedStoryKeys),
    [excludedStoryKeys]
  );
  const epicsWithStories = useMemo<
    Array<{
      epicKey: string;
      epicName: string;
      stories: Array<{
        key: string;
        name: string;
        originalStatus?: string;
        type?: string;
        priority?: string;
      }>;
    }>
  >(() => [], []);

  const allRowKeys = useMemo(() => {
    const keys = new Set(planEpicKeys);
    for (const storyKey of Object.keys(storyPhases)) {
      keys.add(storyKey);
    }
    return [...keys];
  }, [planEpicKeys, storyPhases]);

  const { data: issueMeta, isLoading: isIssueMetaLoading } = useQuery({
    queryKey: ['quarterlyOccupancyIssueMeta', allRowKeys.slice().sort().join(',')],
    queryFn: () => fetchParentStatusesAndTypes(allRowKeys),
    enabled: allRowKeys.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const issueSummaries = useMemo(
    () => issueMeta?.summaries ?? new Map<string, string>(),
    [issueMeta?.summaries]
  );
  const issueStatuses = useMemo(
    () => issueMeta?.statuses ?? new Map<string, string>(),
    [issueMeta?.statuses]
  );
  const issueTypes = useMemo(
    () => issueMeta?.types ?? new Map<string, string>(),
    [issueMeta?.types]
  );

  const sprintInfos = useMemo((): QuarterlySprintInfo[] => {
    const metaById = new Map(
      sprints.map((s) => [s.id, { archived: s.archived, status: s.status }])
    );
    return buildQuarterSprintTimeline(sprints, year, quarter, metaById);
  }, [sprints, year, quarter]);

  const storyKeyToEpicKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const epic of epicsWithStories) {
      for (const story of epic.stories) {
        map.set(story.key, epic.epicKey);
      }
    }
    return map;
  }, [epicsWithStories]);

  const tasks = useMemo((): Task[] => {
    if (allRowKeys.length === 0) return [];
    const result: Task[] = [];
    const seen = new Set<string>();

    const pushTask = (task: Task) => {
      if (seen.has(task.id)) return;
      seen.add(task.id);
      result.push(task);
    };

    for (const epicKey of planEpicKeys) {
      const epicData = epicsWithStories.find((e) => e.epicKey === epicKey);
      buildEpicTaskRows({
        epicData,
        epicDetails: epicDetailsMap.get(epicKey),
        epicKey,
        excludedStoryKeysSet,
        issueStatuses,
        issueSummaries,
        issueTypes,
        pushTask,
      });
    }

    for (const storyKey of Object.keys(storyPhases)) {
      if (seen.has(storyKey)) continue;
      buildStoryPhaseTaskRow({
        epicDetailsMap,
        excludedStoryKeysSet,
        issueStatuses,
        issueSummaries,
        issueTypes,
        pushTask,
        storyKey,
        storyKeyToEpicKey,
      });
    }

    return result;
  }, [
    allRowKeys.length,
    planEpicKeys,
    epicsWithStories,
    epicDetailsMap,
    issueSummaries,
    issueStatuses,
    issueTypes,
    storyPhases,
    storyKeyToEpicKey,
    excludedStoryKeysSet,
  ]);

  return {
    isLoading: isIssueMetaLoading,
    sprintInfos,
    storyPhasesByStory: storyPhases,
    tasks,
  };
}
