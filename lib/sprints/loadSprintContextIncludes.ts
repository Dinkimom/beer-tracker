import type { SprintContextPayload } from '@/lib/sprints/sprintContextTypes';

import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { loadSprintContextDependencies } from '@/lib/sprints/loadSprintContextDependencies';
import {
  loadSprintContextNeighbours,
  type SprintContextNeighbourInclude,
} from '@/lib/sprints/loadSprintContextNeighbours';

type SprintContextInclude = SprintContextNeighbourInclude | 'dependencies';

/**
 * Доп. блоки get_sprint_context (`include`): зависимости и соседние спринты доски. Предупреждения
 * соседей дописываются в meta.warnings.
 */
export async function loadSprintContextIncludes(input: {
  assigneeId?: string;
  include: readonly SprintContextInclude[];
  organizationId: string;
  payload: SprintContextPayload;
}) {
  const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
  const neighbourInclude = input.include.filter(
    (item): item is SprintContextNeighbourInclude => item !== 'dependencies'
  );
  const [dependencies, neighbours] = await Promise.all([
    input.include.includes('dependencies')
      ? loadSprintContextDependencies({ issueTracker, organizationId: input.organizationId, payload: input.payload })
      : undefined,
    neighbourInclude.length > 0
      ? loadSprintContextNeighbours({
          assigneeId: input.assigneeId,
          include: neighbourInclude,
          issueTracker,
          organizationId: input.organizationId,
          payload: input.payload,
        })
      : undefined,
  ]);
  const { warnings = [], ...neighbourBlocks } = neighbours ?? {};
  return {
    ...(dependencies ? { dependencies } : {}),
    ...neighbourBlocks,
    ...(warnings.length > 0
      ? { meta: { ...input.payload.meta, warnings: [...(input.payload.meta.warnings ?? []), ...warnings] } }
      : {}),
  };
}
