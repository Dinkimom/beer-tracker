import type { EpicDetails } from './useEpicStoriesOccupancyData';
import type { Task } from '@/types';

function resolveIssueDisplayName(
  issueKey: string,
  summaries: Map<string, string>,
  fallback?: string
): string {
  const fromSnapshot = summaries.get(issueKey)?.trim();
  if (fromSnapshot) return fromSnapshot;
  const fb = fallback?.trim();
  if (fb && fb.toLocaleUpperCase() !== issueKey.toLocaleUpperCase()) return fb;
  return fb || issueKey;
}

function storyToTaskLike(
  storyKey: string,
  storyName: string,
  epicKey: string,
  epicName: string,
  originalStatus?: string,
  type?: string,
  priority?: string
): Task {
  return {
    id: storyKey,
    name: storyName,
    link: '#',
    originalStatus,
    type,
    priority,
    parent: {
      id: epicKey,
      display: epicName,
      key: epicKey,
    },
    team: 'Back',
  };
}

function taskLikeNoParent(
  id: string,
  name: string,
  originalStatus?: string,
  type?: string,
  priority?: string
): Task {
  return {
    id,
    name,
    link: '#',
    originalStatus,
    type,
    priority,
    team: 'Back',
  };
}

interface EpicWithStories {
  epicKey: string;
  epicName: string;
  stories: Array<{
    key: string;
    name: string;
    originalStatus?: string;
    type?: string;
    priority?: string;
  }>;
}

export function buildEpicTaskRows(params: {
  epicData: EpicWithStories | undefined;
  epicDetails: EpicDetails | undefined;
  epicKey: string;
  excludedStoryKeysSet: Set<string>;
  issueStatuses: Map<string, string>;
  issueSummaries: Map<string, string>;
  issueTypes: Map<string, string>;
  pushTask: (task: Task) => void;
}): void {
  const { epicData, epicDetails, epicKey, excludedStoryKeysSet, issueStatuses, issueSummaries, issueTypes, pushTask } =
    params;
  const epicName = resolveIssueDisplayName(
    epicKey,
    issueSummaries,
    epicDetails?.epicName ?? epicData?.epicName
  );

  if (!epicData || epicData.stories.length === 0) {
    pushTask(
      taskLikeNoParent(
        epicKey,
        epicName,
        issueStatuses.get(epicKey) ?? epicDetails?.epicOriginalStatus,
        issueTypes.get(epicKey) ?? epicDetails?.epicType,
        epicDetails?.epicPriority
      )
    );
    return;
  }

  for (const s of epicData.stories) {
    if (excludedStoryKeysSet.has(s.key)) continue;
    pushTask(
      storyToTaskLike(
        s.key,
        resolveIssueDisplayName(s.key, issueSummaries, s.name),
        epicKey,
        epicName,
        issueStatuses.get(s.key) ?? s.originalStatus,
        issueTypes.get(s.key) ?? s.type,
        s.priority
      )
    );
  }
}

export function buildStoryPhaseTaskRow(params: {
  epicDetailsMap: Map<string, EpicDetails>;
  excludedStoryKeysSet: Set<string>;
  issueStatuses: Map<string, string>;
  issueSummaries: Map<string, string>;
  issueTypes: Map<string, string>;
  pushTask: (task: Task) => void;
  storyKey: string;
  storyKeyToEpicKey: Map<string, string>;
}): void {
  const {
    epicDetailsMap,
    excludedStoryKeysSet,
    issueStatuses,
    issueSummaries,
    issueTypes,
    pushTask,
    storyKey,
    storyKeyToEpicKey,
  } = params;

  if (excludedStoryKeysSet.has(storyKey)) return;

  const epicKey = storyKeyToEpicKey.get(storyKey);
  const storyName = resolveIssueDisplayName(storyKey, issueSummaries);

  if (epicKey) {
    const details = epicDetailsMap.get(epicKey);
    const epicName = resolveIssueDisplayName(epicKey, issueSummaries, details?.epicName);
    pushTask(
      storyToTaskLike(
        storyKey,
        storyName,
        epicKey,
        epicName,
        issueStatuses.get(storyKey),
        issueTypes.get(storyKey)
      )
    );
    return;
  }

  pushTask(
    taskLikeNoParent(
      storyKey,
      storyName,
      issueStatuses.get(storyKey),
      issueTypes.get(storyKey)
    )
  );
}
