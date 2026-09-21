import type { SprintContextPayload } from '@/lib/sprints/sprintContextTypes';
import type { NextRequest } from 'next/server';

import { enrichSprintContextPayload } from '@/lib/sprints/sprintContextEnrichment';
import { buildSprintContext } from '@/lib/sprints/sprintContextService';
import {
  softLoadSprintContextMeta,
  softLoadSprintContextTaskParents,
} from '@/lib/sprints/sprintContextSoftMeta';

/** Shared loader for HTTP sprint-context and in-process MCP tools. */
export async function loadSprintContextForOrganization(input: {
  featureId?: string;
  organizationId: string;
  request: NextRequest | null;
  sprintId: number;
  useStoredTracker: boolean;
}): Promise<SprintContextPayload> {
  const [softMeta, taskIdToParentKey] = await Promise.all([
    softLoadSprintContextMeta({
      organizationId: input.organizationId,
      request: input.useStoredTracker ? null : input.request,
      sprintId: input.sprintId,
      useStoredTracker: input.useStoredTracker,
    }),
    softLoadSprintContextTaskParents({
      featureId: input.featureId,
      organizationId: input.organizationId,
      request: input.useStoredTracker ? null : input.request,
      sprintId: input.sprintId,
      useStoredTracker: input.useStoredTracker,
    }),
  ]);

  const payload = await buildSprintContext({
    featureId: input.featureId,
    organizationId: input.organizationId,
    softMeta,
    sprintId: input.sprintId,
    taskIdToParentKey,
  });

  return enrichSprintContextPayload({
    organizationId: input.organizationId,
    payload,
    request: input.useStoredTracker ? null : input.request,
    softMeta,
    useStoredTracker: input.useStoredTracker,
  });
}
