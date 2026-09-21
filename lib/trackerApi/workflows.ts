/**
 * Tracker API: воркфлоу, экраны, поля, переходы (только сервер).
 */

import type { AxiosInstance } from 'axios';

import { apiCache, cacheKeys } from '../cache';
import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { TRACKER_V3_BASE, WORKFLOW_CACHE_TTL, TRANSITIONS_BATCH_CONCURRENCY } from './constants';

interface WorkflowStepAction {
  id: string;
  key?: string;
  name?: string;
  screen?: { id: string };
  target?: { key?: string };
}
interface WorkflowStep {
  actions?: WorkflowStepAction[];
  metaAction?: WorkflowStepAction;
  status?: { key?: string };
}
import {
  fetchQueueIssueTypeResolutions,
  resolutionOptionsForSelect,
} from './queueResolutions';
import {
  collectTransitionScreensForWorkflow,
  extractScreenElements,
  type ScreenElement,
} from './workflowsHelpers';

interface TrackerFieldSchema {
  id: string;
  key?: string;
  name?: string;
  optionsProvider?: {
    type?: string;
    values?: string[];
  };
  schema?: { type?: string; required?: boolean; items?: string };
}

interface TransitionField {
  display: string;
  id: string;
  options?: Array<string | { label: string; value: string }>;
  required: boolean;
  schemaItems?: string;
  schemaType?: string;
}

interface TransitionItem {
  display?: string;
  id: string;
  screen?: { id: string; display?: string };
  to: { key: string; display?: string };
}

export async function fetchQueueWorkflows(
  queueKey: string,
  axiosInstance?: AxiosInstance
): Promise<Record<string, Array<{ id: string; key: string; display?: string }>>> {
  const cacheKey = cacheKeys.queueWorkflows(queueKey.trim().toUpperCase());
  const cached =
    apiCache.get<Record<string, Array<{ id: string; key: string; display?: string }>>>(cacheKey);
  if (cached) {
    return cached;
  }

  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const { data } = await api.get<Record<string, Array<{ id: string; key: string; display?: string }>>>(
    `${TRACKER_V3_BASE}/queues/${queueKey}/workflows`
  );
  apiCache.set(cacheKey, data, WORKFLOW_CACHE_TTL);
  return data;
}

async function fetchWorkflow(
  workflowId: string,
  axiosInstance?: AxiosInstance
): Promise<{ steps: WorkflowStep[] }> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const { data } = await api.get<{ steps: WorkflowStep[] }>(
    `${TRACKER_V3_BASE}/workflows/${workflowId}`
  );
  return data;
}

export async function fetchField(
  fieldId: string,
  axiosInstance?: AxiosInstance
): Promise<TrackerFieldSchema | null> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const cacheKey = cacheKeys.field(fieldId);
  const cached = apiCache.get<TrackerFieldSchema>(cacheKey);
  if (cached) return cached;
  try {
    const { data } = await api.get<TrackerFieldSchema>(`${TRACKER_V3_BASE}/fields/${fieldId}`);
    apiCache.set(cacheKey, data, WORKFLOW_CACHE_TTL);
    return data;
  } catch {
    return null;
  }
}

export async function fetchScreen(
  screenId: string,
  axiosInstance?: AxiosInstance
): Promise<{ elements: ScreenElement[] }> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const { data } = await api.get<Record<string, unknown>>(
    `${TRACKER_V3_BASE}/screens/${screenId}`
  );
  const elements = extractScreenElements(data ?? {});
  return { elements };
}

export async function fetchIssueTransitions(
  issueKey: string,
  axiosInstance?: AxiosInstance
): Promise<TransitionItem[]> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const { data } = await api.get<TransitionItem[]>(
    `${TRACKER_V3_BASE}/issues/${issueKey}/transitions`
  );
  return data;
}

export async function getTransitionScreenFields(
  issueKey: string,
  transitionId: string,
  axiosInstance?: AxiosInstance
): Promise<TransitionField[] | null> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);

  const transitions = await fetchIssueTransitions(issueKey, api);
  const transition = transitions.find((t) => t.id === transitionId);
  const screenId = transition?.screen?.id;

  if (!screenId) return null;

  const screenCacheKey = cacheKeys.screen(String(screenId));
  let screen = apiCache.get<{ elements: ScreenElement[] }>(screenCacheKey);
  if (!screen) {
    screen = await fetchScreen(String(screenId), api);
    apiCache.set(screenCacheKey, screen, WORKFLOW_CACHE_TTL);
  }

  if (!screen?.elements?.length) return null;

  return screen.elements.map((el) => ({
    id: el.field.id,
    display: el.field.display || el.field.id,
    required: el.required,
  }));
}

async function resolveCachedScreen(
  screenId: string,
  api: AxiosInstance
): Promise<{ elements: ScreenElement[] }> {
  const screenCacheKey = cacheKeys.screen(screenId);
  const cached = apiCache.get<{ elements: ScreenElement[] }>(screenCacheKey);
  if (cached) {
    return cached;
  }
  const screen = await fetchScreen(screenId, api);
  apiCache.set(screenCacheKey, screen, WORKFLOW_CACHE_TTL);
  return screen;
}

function collectTransitionScreensForWorkflowFromApi(
  workflow: { steps: WorkflowStep[] },
  api: AxiosInstance
): Promise<Record<string, TransitionField[]>> {
  return collectTransitionScreensForWorkflow(workflow, (screenId) =>
    resolveCachedScreen(screenId, api)
  );
}

function attachResolutionOptionsToTransitionFields(
  fields: TransitionField[],
  resolutionOptions: Array<{ label: string; value: string }>
): TransitionField[] {
  if (resolutionOptions.length === 0) {
    return fields.map((field) => ({ ...field }));
  }
  return fields.map((field) => {
    if (field.id !== 'resolution') {
      return { ...field };
    }
    return {
      ...field,
      schemaType: field.schemaType ?? 'resolution',
      options: resolutionOptions,
    };
  });
}

function cloneTransitionScreensWithResolutions(
  transitionScreens: Record<string, TransitionField[]>,
  resolutionOptions: Array<{ label: string; value: string }>
): Record<string, TransitionField[]> {
  const cloned: Record<string, TransitionField[]> = {};
  for (const [transitionKey, fields] of Object.entries(transitionScreens)) {
    cloned[transitionKey] = attachResolutionOptionsToTransitionFields(fields, resolutionOptions);
  }
  return cloned;
}

async function assignWorkflowScreensToIssueTypes(
  result: Record<string, Record<string, TransitionField[]>>,
  queueKey: string,
  typeList: Array<{ key?: string }>,
  transitionScreens: Record<string, TransitionField[]>,
  api: AxiosInstance
): Promise<void> {
  for (const issueType of typeList) {
    if (!issueType?.key) continue;
    const resolutions = await fetchQueueIssueTypeResolutions(queueKey, issueType.key, api);
    result[issueType.key] = cloneTransitionScreensWithResolutions(
      transitionScreens,
      resolutionOptionsForSelect(resolutions)
    );
  }
}

export async function fetchQueueWorkflowScreens(
  queueKey: string,
  axiosInstance?: AxiosInstance
): Promise<Record<string, Record<string, TransitionField[]>>> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const cacheKey = cacheKeys.queueWorkflowScreens(queueKey);
  const cached = apiCache.get<Record<string, Record<string, TransitionField[]>>>(cacheKey);
  if (cached) return cached;

  const result: Record<string, Record<string, TransitionField[]>> = {};

  const workflows = await fetchQueueWorkflows(queueKey, api);
  for (const [workflowId, typeList] of Object.entries(workflows)) {
    if (!typeList?.length) continue;

    const workflow =
      apiCache.get<{ steps: WorkflowStep[] }>(cacheKeys.workflow(workflowId)) ??
      (await fetchWorkflow(workflowId, api));
    apiCache.set(cacheKeys.workflow(workflowId), workflow, WORKFLOW_CACHE_TTL);

    const transitionScreens = await collectTransitionScreensForWorkflowFromApi(workflow, api);
    await assignWorkflowScreensToIssueTypes(result, queueKey, typeList, transitionScreens, api);
  }

  apiCache.set(cacheKey, result, WORKFLOW_CACHE_TTL);
  return result;
}

export async function fetchTransitionsBatch(
  issueKeys: string[],
  axiosInstance?: AxiosInstance
): Promise<Record<string, TransitionItem[]>> {
  if (issueKeys.length === 0) return {};
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const result: Record<string, TransitionItem[]> = {};
  const uniqueKeys = [...new Set(issueKeys)];

  for (let i = 0; i < uniqueKeys.length; i += TRANSITIONS_BATCH_CONCURRENCY) {
    const batch = uniqueKeys.slice(i, i + TRANSITIONS_BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (key) => {
        const data = await api.get<TransitionItem[]>(
          `${TRACKER_V3_BASE}/issues/${key}/transitions`
        );
        return { key, list: data.data };
      })
    );
    settled.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) {
        result[r.value.key] = r.value.list;
      }
    });
  }
  return result;
}
