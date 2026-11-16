/**
 * Привязка цели спринта к строке квартального плана (docs/QUARTERLY_PLAN_RULES.md, QG5):
 * эпик или направление плана квартала. Чистые функции — без БД.
 */

import type { QuarterlyPlan, QuarterlyPlanContent, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { ChecklistItem } from '@/types/tracker';

import { z } from 'zod';

import { QuarterRefSchema } from '@/lib/quarterlyPlans/quarterlyPlanContentParse';
import { epicTitle } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { topLevelEpics } from '@/lib/quarterlyPlans/quarterlyPlanRows';

/** Строка плана у цели: квартал плана и id эпика или направления в нём. */
export interface SprintGoalPlanRow extends QuarterRef {
  rowId: string;
}

const planRowSchema = QuarterRefSchema.extend({ rowId: z.string().trim().min(1).max(80) }).strict();

/** Привязка из тела запроса; null — значение не похоже на привязку. */
export function parseSprintGoalPlanRow(value: unknown): SprintGoalPlanRow | null {
  const parsed = planRowSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Есть ли в плане строка с таким id: эпик или направление (id общие на план, QE4). */
export function planHasRow(plan: Pick<QuarterlyPlanContent, 'directions' | 'epics'>, rowId: string): boolean {
  return plan.epics.some((epic) => epic.id === rowId) || plan.directions.some((direction) => direction.id === rowId);
}

/** Привязка из колонок `sprint_goals`; их три, и заполнены они только вместе. */
export function planRowFromColumns(row: {
  plan_quarter: number | null;
  plan_row_id: string | null;
  plan_year: number | null;
}): SprintGoalPlanRow | null {
  if (row.plan_year === null || row.plan_quarter === null || row.plan_row_id === null) return null;
  return { quarter: row.plan_quarter as QuarterRef['quarter'], rowId: row.plan_row_id, year: row.plan_year };
}

/** Цель спринта в ответе `/api/sprint-goals`: пункт чек-листа и его строка плана. */
export interface SprintGoalItem extends ChecklistItem {
  planRow: SprintGoalPlanRow | null;
}

export function toSprintGoalItem(row: {
  done: boolean;
  id: string;
  planRow: SprintGoalPlanRow | null;
  text: string;
}): SprintGoalItem {
  return {
    checked: Boolean(row.done),
    checklistItemType: 'standard',
    id: String(row.id),
    planRow: row.planRow,
    text: row.text ?? '',
  };
}

/** Строка плана в выборе привязки цели: направление или эпик под ним. */
export interface GoalPlanRowOption {
  /** Направление эпика; у строки-направления нет. */
  directionTitle?: string;
  planRow: SprintGoalPlanRow;
  title: string;
}

/** Ключ привязки: один на строку плана во всех кварталах. */
export function goalPlanRowKey({ quarter, rowId, year }: SprintGoalPlanRow): string {
  return `${year}-Q${quarter}:${rowId}`;
}

/**
 * Строки, к которым можно привязать цель спринта (QG5): направления команды доски и эпики под каждым,
 * в порядке плана. `plans` — планы кварталов, которые задевает спринт. У доски нет команды в плане —
 * строки всех команд.
 */
export function buildGoalPlanRowOptions(
  plans: ReadonlyArray<Pick<QuarterlyPlan, 'directions' | 'epics' | 'quarter' | 'teams' | 'trackerEpics' | 'year'>>,
  boardId: number | null
): GoalPlanRowOption[] {
  return plans.flatMap((plan) => {
    const { quarter, year } = plan;
    const team = plan.teams.find((row) => row.boardId === boardId);
    return plan.directions
      .filter((direction) => !team || direction.teamId === team.id)
      .flatMap((direction) => {
        const directionTitle = epicTitle(direction, plan.trackerEpics);
        // Задачи эпиков в выбор не идут: цель спринта привязывают к эпику или направлению.
        const epics = topLevelEpics(plan.epics, direction.id)
          .map((epic) => ({
            directionTitle,
            planRow: { quarter, rowId: epic.id, year },
            title: epicTitle(epic, plan.trackerEpics),
          }));
        return [{ planRow: { quarter, rowId: direction.id, year }, title: directionTitle }, ...epics];
      });
  });
}
