import type { QuarterlySprintScoreEntry } from '../utils/quarterlySprintScore';
import type { QuarterlySprintScoreMapResult } from './useQuarterlySprintScoreMap';

interface SprintScoreQueryResult {
  data?: {
    entry?: QuarterlySprintScoreEntry;
    hideTp: boolean;
    sprintId: number;
  };
  isLoading: boolean;
}

function applySprintScoreQueryRow(
  scoresBySprintId: Map<number, QuarterlySprintScoreEntry>,
  query: SprintScoreQueryResult
): { hasData: boolean; hideTp: boolean } {
  if (!query.data) return { hasData: false, hideTp: false };
  if (query.data.entry) {
    scoresBySprintId.set(query.data.sprintId, query.data.entry);
  }
  return { hasData: true, hideTp: query.data.hideTp };
}

function foldSprintScoreQueries(queries: SprintScoreQueryResult[]): {
  hasAnyData: boolean;
  hideTp: boolean;
  scoresBySprintId: Map<number, QuarterlySprintScoreEntry>;
} {
  const scoresBySprintId = new Map<number, QuarterlySprintScoreEntry>();
  let hideTp = false;
  let hasAnyData = false;

  for (const query of queries) {
    const applied = applySprintScoreQueryRow(scoresBySprintId, query);
    hasAnyData = applied.hasData || hasAnyData;
    if (applied.hideTp) hideTp = true;
  }

  return { hasAnyData, hideTp, scoresBySprintId };
}

export function mergeQuarterlySprintScoreQueries(
  queries: SprintScoreQueryResult[]
): QuarterlySprintScoreMapResult | undefined {
  if (queries.length === 0) return undefined;

  const { hasAnyData, hideTp, scoresBySprintId } = foldSprintScoreQueries(queries);
  if (!hasAnyData && queries.some((q) => q.isLoading)) return undefined;
  return { hideTp, scoresBySprintId };
}
