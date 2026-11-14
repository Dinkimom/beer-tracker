/**
 * API квартального плана: общий на организацию, все команды в одной сетке.
 */

import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

export async function fetchQuarterlyPlan({ quarter, year }: QuarterRef): Promise<QuarterlyPlan> {
  const { data } = await getPlannerBeerTrackerApi().get<{ plan: QuarterlyPlan }>(
    `/quarterly-plans?year=${year}&quarter=${quarter}`
  );
  // План, сохранённый до появления заметок и зависимостей, приходит без них.
  return { ...data.plan, links: data.plan.links ?? [], notes: data.plan.notes ?? [] };
}

export async function saveQuarterlyPlan(
  ref: QuarterRef,
  content: QuarterlyPlanContent
): Promise<void> {
  await getPlannerBeerTrackerApi().put('/quarterly-plans', { ...ref, ...content });
}
