import type { AccessProfile } from '@/lib/access/orgAccess';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { canUsePlanner } from '@/lib/access/orgAccess';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { searchSprintsForOrganization } from '@/lib/mcp/searchSprintsForOrganization';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import { SprintPlanPatchOpsSchema } from '@/lib/sprints/sprintPlanPatchSchema';
import {
  applySprintPlanPatch,
  proposeSprintPlanPatch,
} from '@/lib/sprints/sprintPlanPatchService';
import { searchStaffInOrg } from '@/lib/staffTeams';

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true as const,
  };
}

function toolJson(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function loadContext(input: {
  assigneeId?: string;
  featureId?: string;
  organizationId: string;
  sprintId: number;
  taskIds?: string[];
}) {
  return loadSprintContextForOrganization({
    assigneeId: input.assigneeId,
    featureId: input.featureId,
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprintId,
    taskIds: input.taskIds,
    useStoredTracker: true,
  });
}

function plannerWriteDenied(profile: AccessProfile): string | null {
  if (canUsePlanner(profile)) {
    return null;
  }
  return 'forbidden: planner write requires organization admin or team membership';
}

export function createSprintContextMcpServer(input: {
  organizationId: string;
  profile: AccessProfile;
  userId: string;
}): McpServer {
  const server = new McpServer({
    name: 'beer-tracker-sprint-context',
    version: '1.5.0',
  });

  server.registerTool(
    'search_sprints',
    {
      description:
        'Find tracker sprints by a partial name (e.g. "Sprint 31", "RND Team 1"). Returns sprintId/boardId/status/dates — use sprintId with get_sprint_context. Prefer this when the user does not know the numeric sprint id.',
      inputSchema: {
        boardId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Optional board id to search only that board'),
        limit: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe('Max hits to return (default 20)'),
        query: z
          .string()
          .describe('Substring of the sprint name (case-insensitive); empty = list recent/active'),
      },
    },
    async ({ boardId, limit, query }) => {
      try {
        const issueTracker = await getIssueTrackerProviderClientForOrganization(
          input.organizationId
        );
        const result = await searchSprintsForOrganization({
          boardId,
          issueTracker,
          limit,
          query,
        });
        return toolJson({
          hits: result.hits,
          hint: 'Pass hits[].sprintId to get_sprint_context. Name number ≠ sprintId (e.g. "Sprint 31" may be id 1152).',
          truncated: result.truncated,
          warnings: result.warnings,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_sprint_context',
    {
      description:
        'Read-only Beer Tracker planning graph for a sprint: positions (day/part + planVsActual), capacity (tasks only; sticky notes do not reserve time), feature lanes, notes, links, goals, availability. Prefer assigneeId/taskIds to keep the payload small. Requires numeric tracker sprintId — call search_sprints first if only a name is known.',
      inputSchema: {
        assigneeId: z
          .string()
          .min(1)
          .optional()
          .describe('Optional staff:uuid or tracker user id — narrow positions/notes/capacity'),
        featureId: z
          .string()
          .optional()
          .describe('Optional feature lane id or tracker feature key to narrow the graph'),
        sprintId: z
          .number()
          .int()
          .positive()
          .describe('Tracker sprint id from search_sprints or planner URL'),
        taskIds: z
          .array(z.string().min(1))
          .max(100)
          .optional()
          .describe('Optional issue keys to include (positions/links scoped to these tasks)'),
      },
    },
    async ({ assigneeId, featureId, sprintId, taskIds }) => {
      try {
        const payload = await loadContext({
          assigneeId,
          featureId,
          organizationId: input.organizationId,
          sprintId,
          taskIds,
        });
        return toolJson(payload);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_sprint_capacity',
    {
      description:
        'Capacity analysis for a sprint: per-person load vs free parts (meta.partsPerDay from org settings), overlaps, gaps, overloaded days. Sticky notes do not reserve capacity — only task positions. Prefer this over raw positions when answering "who is overloaded / where is free capacity".',
      inputSchema: {
        assigneeId: z
          .string()
          .min(1)
          .optional()
          .describe('Optional staff:uuid — capacity for one person'),
        featureId: z
          .string()
          .optional()
          .describe('Optional feature lane id — capacity only for that feature scope'),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ assigneeId, featureId, sprintId }) => {
      try {
        const payload = await loadContext({
          assigneeId,
          featureId,
          organizationId: input.organizationId,
          sprintId,
        });
        return toolJson({
          capacity: payload.capacity ?? buildSprintContextCapacity(payload),
          meta: {
            calendarDays: payload.meta.calendarDays,
            featureId: payload.meta.featureId,
            partsPerDay: payload.meta.partsPerDay,
            sprintId: payload.meta.sprintId,
            sprintWindow: payload.meta.sprintWindow,
            warnings: payload.meta.warnings,
          },
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_feature_context',
    {
      description:
        'Planning graph scoped to one feature lane (required featureId): positions, notes/diagrams, links, capacity for that feature. Same shape as get_sprint_context with meta.featureId set.',
      inputSchema: {
        featureId: z
          .string()
          .min(1)
          .describe('Feature lane id, draft id (feature-draft:…), or tracker feature/issue key'),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ featureId, sprintId }) => {
      try {
        const payload = await loadContext({
          featureId,
          organizationId: input.organizationId,
          sprintId,
        });
        return toolJson(payload);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'resolve_person',
    {
      description:
        'Resolve a person by name/email/tracker id fragment to staffUid + assigneeId (staff:uuid) for capacity/context matching. Query must be at least 2 characters.',
      inputSchema: {
        query: z
          .string()
          .min(2)
          .describe('Substring of display name, email, or tracker user id'),
      },
    },
    async ({ query: queryText }) => {
      try {
        const hits = await searchStaffInOrg(input.organizationId, queryText);
        return toolJson({
          hits: hits.map((hit) => ({
            assigneeId: hit.staffUid ? `staff:${hit.staffUid}` : hit.trackerId,
            displayName: hit.displayName,
            email: hit.email ?? null,
            staffUid: hit.staffUid ?? null,
            trackerId: hit.trackerId,
          })),
          hint: 'Use assigneeId / staffUid when reading positions or capacity; trackerId is the issue-tracker user id.',
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'propose_plan_patch',
    {
      description:
        'Dry-run a Beer Tracker planning patch (positions, links, feature drafts, goals). createNote writes draft sticky notes immediately (translucent until apply) — notes do NOT reserve capacity. upsertPosition places tasks; set syncToTracker=true to also add the issue to the tracker sprint and assign. Returns summary, schedule (calendar layout), capacityPreview, warnings (e.g. issue_not_in_sprint), draftNoteIds, applyToken (TTL 30m). Always call before apply_plan_patch. Part indices must be 0..meta.partsPerDay-1.',
      inputSchema: {
        ops: SprintPlanPatchOpsSchema.describe(
          '1–50 ops: upsertPosition|deletePosition|createNote|updateNote|deleteNote|upsertLink|deleteLink|upsertFeatureDraft|createGoal|updateGoal|deleteGoal'
        ),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ ops, sprintId }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) {
          return toolError(new Error(denied));
        }
        const result = await proposeSprintPlanPatch({
          actorUserId: input.userId,
          ops,
          organizationId: input.organizationId,
          sprintId,
        });
        return toolJson({
          ...result,
          hint: 'Review the translucent draft notes on the planner (and summary/capacityPreview), then call apply_plan_patch with the same ops + applyToken and confirm=true.',
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'apply_plan_patch',
    {
      description:
        'Apply a previously proposed plan patch. Requires confirm=true and the applyToken from propose_plan_patch (same ops). Confirms draft notes and writes remaining ops. upsertPosition with syncToTracker=true adds the issue to the tracker sprint and assigns (BT position is always written even if tracker sync fails). Returns schedule + capacity. Not silent — refuse without confirm.',
      inputSchema: {
        applyToken: z.string().min(1).describe('Token from propose_plan_patch'),
        confirm: z
          .literal(true)
          .describe('Must be true — explicit approval to write'),
        ops: SprintPlanPatchOpsSchema.describe('Exact ops array from propose_plan_patch'),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ applyToken, confirm, ops, sprintId }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) {
          return toolError(new Error(denied));
        }
        const result = await applySprintPlanPatch({
          actorUserId: input.userId,
          applyToken,
          confirm,
          ops,
          organizationId: input.organizationId,
          sprintId,
        });
        return toolJson(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  return server;
}
