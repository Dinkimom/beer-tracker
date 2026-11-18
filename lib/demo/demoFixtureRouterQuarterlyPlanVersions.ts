/**
 * История версий квартального плана в `/demo/planner` (QH1–QH5): тот же контракт, что у
 * `/api/quarterly-plans/versions`. Склейка правок и сводка — общие правила из `lib/quarterlyPlans`.
 */

import type { DemoFixtureResult } from './demoFixtureRouterTypes';
import type { QuarterlyPlanContent, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterlyPlanVersionSource } from '@/lib/quarterlyPlans/quarterlyPlanVersions';

import { removeDirection } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { mergesIntoLatestVersion, summarizeQuarterlyPlanVersion } from '@/lib/quarterlyPlans/quarterlyPlanVersions';
import { randomUuid } from '@/lib/randomUuid';

import { getDemoFixtureStore } from './demoFixtureStore';
import { DEMO_PLANNER_NOW } from './demoIds';

/** Тот, кто правит план в демо: у демо-страницы нет текущего пользователя трекера. */
const DEMO_EDITOR = { id: 'demo-viewer', name: 'Demo user' };

export interface DemoQuarterlyPlanVersion {
  authorId: string | null;
  authorName: string | null;
  content: QuarterlyPlanContent;
  createdAt: string;
  id: string;
  planVersion: number;
  source: QuarterlyPlanVersionSource;
  updatedAt: string;
}

function ok(data: unknown, status = 200): DemoFixtureResult {
  return { data, status };
}

function daysAgo(days: number, hour: number): string {
  const at = new Date(DEMO_PLANNER_NOW);
  at.setDate(at.getDate() - days);
  at.setHours(hour, 0, 0, 0);
  return at.toISOString();
}

/**
 * Прошлое сида Q4 2026 для примера: план без «Reports builder» и задач эпика оплаты (основа), затем агент
 * добавил направление, затем человек расписал задачи. Последняя версия — сам сид.
 */
function seedHistory(content: QuarterlyPlanContent): DemoQuarterlyPlanVersion[] {
  const withoutTasks: QuarterlyPlanContent = {
    ...content,
    assignments: content.assignments.filter((row) => !row.epicId?.startsWith('demo-direction-1-epic-2-task')),
    epics: content.epics.filter((row) => !row.id.startsWith('demo-direction-1-epic-2-task')),
  };
  const reports = content.directions.find((direction) => direction.title === 'Reports builder');
  const baseline = reports ? removeDirection(withoutTasks, reports.id) : withoutTasks;
  const version = (
    id: string,
    planVersion: number,
    body: QuarterlyPlanContent,
    source: QuarterlyPlanVersionSource,
    author: { id: string; name: string } | null,
    at: string
  ): DemoQuarterlyPlanVersion => ({
    authorId: author?.id ?? null,
    authorName: author?.name ?? null,
    content: body,
    createdAt: at,
    id,
    planVersion,
    source,
    updatedAt: at,
  });
  return [
    version('a0000000-0000-4000-8000-00000000a001', 1, baseline, 'baseline', null, daysAgo(6, 10)),
    version('a0000000-0000-4000-8000-00000000a002', 1, withoutTasks, 'agent', { id: 'demo-dennis', name: 'Dennis Ritchie' }, daysAgo(3, 15)),
    version('a0000000-0000-4000-8000-00000000a003', 1, content, 'user', { id: 'demo-alice', name: 'Alice' }, daysAgo(1, 11)),
  ];
}

/** Версии квартала, старые первыми; у Q4 2026 — с примером прошлого. */
export function demoQuarterlyPlanVersions(
  key: string,
  stored: { content: QuarterlyPlanContent; version: number },
  isSeedQuarter: boolean
): DemoQuarterlyPlanVersion[] {
  const store = getDemoFixtureStore();
  store.quarterlyPlanVersions[key] ??= isSeedQuarter ? seedHistory(stored.content) : [];
  return store.quarterlyPlanVersions[key];
}

/** Сохранение из демо легло в план — версия или склейка с последней (QH2). */
export function recordDemoQuarterlyPlanVersion(
  versions: DemoQuarterlyPlanVersion[],
  input: { before: { content: QuarterlyPlanContent; version: number }; content: QuarterlyPlanContent; planVersion: number; source: QuarterlyPlanVersionSource }
): void {
  const now = new Date();
  const at = now.toISOString();
  if (versions.length === 0) {
    versions.push({ authorId: null, authorName: null, content: input.before.content, createdAt: at, id: randomUuid(), planVersion: input.before.version, source: 'baseline', updatedAt: at });
  }
  const latest = versions.at(-1)!;
  const merge = mergesIntoLatestVersion(
    { authorId: latest.authorId, source: latest.source, updatedAt: new Date(latest.updatedAt) },
    { authorId: DEMO_EDITOR.id, at: now, source: input.source }
  );
  if (merge) {
    Object.assign(latest, { content: input.content, planVersion: input.planVersion, updatedAt: at });
    return;
  }
  versions.push({
    authorId: DEMO_EDITOR.id,
    authorName: DEMO_EDITOR.name,
    content: input.content,
    createdAt: at,
    id: randomUuid(),
    planVersion: input.planVersion,
    source: input.source,
    updatedAt: at,
  });
}

/** Список, одна версия и откат: \`/quarterly-plans/versions[/:id]\`. */
export function handleDemoQuarterlyPlanVersions(input: {
  method: string;
  path: string;
  read: () => { content: QuarterlyPlanContent; version: number };
  ref: QuarterRef;
  versions: DemoQuarterlyPlanVersion[];
  write: (content: QuarterlyPlanContent) => number;
  ifVersion?: number;
}): DemoFixtureResult | null {
  const { method, path, versions } = input;
  if (path === '/quarterly-plans/versions' && method === 'get') {
    const newestFirst = [...versions].reverse();
    return ok({
      versions: newestFirst.map(({ authorId: _authorId, content, ...version }, index) => {
        const previous = newestFirst[index + 1];
        return { ...version, summary: previous ? summarizeQuarterlyPlanVersion(previous.content, content) : [] };
      }),
    });
  }
  const match = /^\/quarterly-plans\/versions\/([^/]+)$/.exec(path);
  if (!match) return null;
  const index = versions.findIndex((version) => version.id === match[1]);
  const version = versions[index];
  if (!version) return ok({ error: 'Version not found' }, 404);
  if (method === 'get') return ok({ content: version.content, previousContent: versions[index - 1]?.content ?? null });
  if (method !== 'post') return null;
  const before = input.read();
  if (before.version !== input.ifVersion) return ok({ error: 'The plan changed, try again' }, 409);
  const planVersion = input.write(version.content);
  recordDemoQuarterlyPlanVersion(versions, { before, content: version.content, planVersion, source: 'restore' });
  return ok({ version: planVersion });
}
