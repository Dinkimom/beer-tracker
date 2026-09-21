import type { IssueTrackerScreenField, IssueTrackerScreenFieldOption } from './types';
import type { AxiosInstance } from 'axios';

import { fetchField } from '@/lib/trackerApi';
import { TRACKER_V3_BASE } from '@/lib/trackerApi/constants';
import {
  fetchQueueIssueTypeResolutions,
  resolutionOptionsForSelect,
} from '@/lib/trackerApi/queueResolutions';

interface ScreenFieldSeed {
  display: string;
  id: string;
  required: boolean;
}

type TrackerFieldSchema = Awaited<ReturnType<typeof fetchField>>;

function isResolutionScreenField(id: string, schemaType?: string): boolean {
  return id === 'resolution' || schemaType === 'resolution';
}

function fixedListOptions(schema: TrackerFieldSchema): string[] | undefined {
  const opts =
    schema?.optionsProvider?.type === 'FixedListOptionsProvider'
      ? schema.optionsProvider?.values
      : undefined;
  return Array.isArray(opts) ? opts : undefined;
}

export function pickScreenFieldOptions(input: {
  fieldId: string;
  resolutionOptions?: IssueTrackerScreenFieldOption[];
  schema: TrackerFieldSchema;
  schemaType?: string;
}): IssueTrackerScreenFieldOption[] | undefined {
  const fixed = fixedListOptions(input.schema);
  if (fixed?.length) {
    return fixed;
  }
  if (
    isResolutionScreenField(input.fieldId, input.schemaType) &&
    input.resolutionOptions?.length
  ) {
    return input.resolutionOptions;
  }
  return undefined;
}

export function enrichYandexScreenFieldSeeds(
  seeds: ScreenFieldSeed[],
  api: AxiosInstance,
  resolutionOptions?: IssueTrackerScreenFieldOption[]
): Promise<IssueTrackerScreenField[]> {
  return Promise.all(
    seeds.map(async (f) => {
      const schema = await fetchField(f.id, api);
      const schemaType = schema?.schema?.type;
      const schemaItems =
        typeof schema?.schema?.items === 'string' ? schema.schema.items : undefined;
      return {
        id: f.id,
        display: schema?.name || f.display,
        // Screen/transition required — not global field schema (usually "required on create").
        required: f.required,
        schemaType,
        ...(schemaItems ? { schemaItems } : {}),
        options: pickScreenFieldOptions({
          fieldId: f.id,
          resolutionOptions,
          schema,
          schemaType,
        }),
      };
    })
  );
}

function extractIssueRefKey(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const key = (value as { key?: unknown }).key;
  return typeof key === 'string' && key.trim() ? key : undefined;
}

async function loadIssueQueueAndTypeKeys(
  issueKey: string,
  api: AxiosInstance
): Promise<{ queueKey?: string; typeKey?: string }> {
  try {
    const { data } = await api.get<Record<string, unknown>>(
      `${TRACKER_V3_BASE}/issues/${encodeURIComponent(issueKey)}`
    );
    return {
      queueKey: extractIssueRefKey(data.queue),
      typeKey: extractIssueRefKey(data.type),
    };
  } catch {
    return {};
  }
}

export async function loadResolutionOptionsForIssue(
  issueKey: string,
  api: AxiosInstance
): Promise<IssueTrackerScreenFieldOption[] | undefined> {
  const { queueKey, typeKey } = await loadIssueQueueAndTypeKeys(issueKey, api);
  if (!queueKey) {
    return undefined;
  }
  const resolutions = await fetchQueueIssueTypeResolutions(queueKey, typeKey, api);
  const options = resolutionOptionsForSelect(resolutions);
  return options.length > 0 ? options : undefined;
}

export function seedsNeedResolutionOptions(seeds: ScreenFieldSeed[]): boolean {
  return seeds.some((f) => f.id === 'resolution');
}
