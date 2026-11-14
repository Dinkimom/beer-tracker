import type { QuarterNumber, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

/** Про что сессия агента: спринт доски или квартальный план организации. */
export type AgentSessionScope =
  | { kind: 'quarter'; quarter: QuarterNumber; year: number }
  | { kind: 'sprint'; sprintId: number };

export function sprintScope(sprintId: number): AgentSessionScope {
  return { kind: 'sprint', sprintId };
}

export function quarterScope({ quarter, year }: QuarterRef): AgentSessionScope {
  return { kind: 'quarter', quarter, year };
}

/** Ключ области для карт и сравнения: `sprint:1153`, `quarter:2026-Q4`. */
export function agentSessionScopeKey(scope: AgentSessionScope): string {
  return scope.kind === 'sprint' ? `sprint:${scope.sprintId}` : `quarter:${scope.year}-Q${scope.quarter}`;
}

/** Колонки `agent_sessions`: ровно одно из `sprint_id` и пары `plan_year` + `plan_quarter`. */
export function agentSessionScopeColumns(scope: AgentSessionScope): {
  planQuarter: number | null;
  planYear: number | null;
  sprintId: number | null;
} {
  return scope.kind === 'sprint'
    ? { planQuarter: null, planYear: null, sprintId: scope.sprintId }
    : { planQuarter: scope.quarter, planYear: scope.year, sprintId: null };
}

export function agentSessionScopeFromColumns(row: {
  plan_quarter: number | null;
  plan_year: number | null;
  sprint_id: number | null;
}): AgentSessionScope {
  if (row.sprint_id != null) return sprintScope(row.sprint_id);
  return { kind: 'quarter', quarter: (row.plan_quarter ?? 1) as QuarterNumber, year: row.plan_year ?? 0 };
}
