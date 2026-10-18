import type { AccessProfile } from '@/lib/access/orgAccess';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { canUsePlanner } from '@/lib/access/orgAccess';
import { findUserById } from '@/lib/auth/userRepository';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { getIssueForOrganization } from '@/lib/mcp/getIssueForOrganization';
import { getIssueSnapshotForOrganization } from '@/lib/mcp/getIssueSnapshotForOrganization';
import { resolveRegisteredMcpClientBrand } from '@/lib/mcp/oauth/mcpOAuthService';
import { registerRetroBoardMcpTools } from '@/lib/mcp/registerRetroBoardMcpTools';
import { searchIssuesForOrganization } from '@/lib/mcp/searchIssuesForOrganization';
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
  mcpClientId?: string;
  organizationId: string;
  profile: AccessProfile;
  userId: string;
}): McpServer {
  const server = new McpServer({
    name: 'beer-tracker-sprint-context',
    version: '1.9.0',
  });

  server.registerTool(
    'whoami',
    {
      description:
        'Current Beer Tracker MCP identity: product userId, email/displayName, orgRole, canUsePlanner, and optionally the linked tracker /myself.',
      inputSchema: {
        includeTracker: z
          .boolean()
          .optional()
          .describe('When true, also call tracker getCurrentUser (/myself)'),
      },
    },
    async ({ includeTracker }) => {
      try {
        const user = await findUserById(input.userId);
        const payload: Record<string, unknown> = {
          canUsePlanner: canUsePlanner(input.profile),
          displayName: user?.display_name || null,
          email: user?.email || null,
          organizationId: input.organizationId,
          orgRole: input.profile.orgRole,
          userId: input.userId,
        };
        if (includeTracker) {
          try {
            const issueTracker = await getIssueTrackerProviderClientForOrganization(
              input.organizationId
            );
            payload.trackerUser = await issueTracker.getCurrentUser();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            payload.trackerUserWarning = `tracker_myself_unavailable: ${message}`;
          }
        }
        return toolJson(payload);
      } catch (error) {
        return toolError(error);
      }
    }
  );

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
        'Read-only Beer Tracker planning graph for a sprint: positions (day/part + planVsActual + status/statusCategory/sprintHistory), capacity (tasks only; sticky notes do not reserve time), feature lanes, notes, links, goals, availability. Prefer assigneeId/taskIds to keep the payload small. Filter “in work” via statusCategory (not-started|in-progress|paused|done), not raw statusType. meta.calendarDays are working days only. meta.weekendDays are Sat/Sun in the sprint window with no day index — do not plan positions on those dates. Requires numeric tracker sprintId — call search_sprints first if only a name is known.',
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
        'Capacity analysis for a sprint: per-person load vs free parts (meta.partsPerDay from org settings), overlaps, gaps, overloaded days. Sticky notes do not reserve capacity — only task positions. meta.weekendDays are Sat/Sun and are not capacity days — do not plan there. Prefer this over raw positions when answering "who is overloaded / where is free capacity".',
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
            calendarDays: payload.meta.calendarDays, weekendDays: payload.meta.weekendDays,
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
    'search_issues',
    {
      description:
        'Search tracker issues on a board/backlog (not only planned positions). Filter by text, issueType (e.g. Bug), status/statusType, priority, notInActiveSprint. statusType filters use planning statusCategory (Ready for development → not-started, not inProgress). Returns compact hits including statusCategory. Use before estimating backlog bugs.',
      inputSchema: {
        boardId: z.number().int().positive().describe('Tracker board id'),
        issueType: z
          .string()
          .optional()
          .describe('Issue type substring, e.g. Bug / Task'),
        limit: z.number().int().positive().max(50).optional().describe('Max hits (default 30)'),
        notInActiveSprint: z
          .boolean()
          .optional()
          .describe('When true, only issues with no sprint membership'),
        priority: z.string().optional().describe('Priority substring, e.g. Critical'),
        query: z
          .string()
          .optional()
          .describe('Optional text/key search; omit to scan board issues then filter'),
        status: z.string().optional().describe('Status key/display substring'),
        statusType: z
          .string()
          .optional()
          .describe('Planning filter: not-started|new|inProgress|done (uses statusCategory heuristics)'),
      },
    },
    async ({
      boardId,
      issueType,
      limit,
      notInActiveSprint,
      priority,
      query: queryText,
      status,
      statusType,
    }) => {
      try {
        const issueTracker = await getIssueTrackerProviderClientForOrganization(
          input.organizationId
        );
        const result = await searchIssuesForOrganization({
          filters: {
            boardId,
            issueType,
            limit,
            notInActiveSprint,
            priority,
            query: queryText,
            status,
            statusType,
          },
          issueTracker,
        });
        return toolJson({
          hits: result.hits,
          hint: 'Hits are tracker issues (not Beer Tracker positions). Prefer statusCategory over statusType for “in work”. Pair with get_issue / get_sprint_context.',
          truncated: result.truncated,
          warnings: result.warnings,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_issue',
    {
      description:
        'Live tracker issue detail: summary, description, status/statusCategory, links, and comments (from changelog+comments API). Use after search_issues when you need full context for estimation or planning.',
      inputSchema: {
        includeComments: z
          .boolean()
          .optional()
          .describe('Default true; set false to skip comments fetch'),
        issueKey: z.string().min(1).describe('Tracker issue key, e.g. RND-123'),
      },
    },
    async ({ includeComments, issueKey }) => {
      try {
        const issueTracker = await getIssueTrackerProviderClientForOrganization(
          input.organizationId
        );
        const result = await getIssueForOrganization({
          includeComments,
          issueKey,
          issueTracker,
        });
        return toolJson({
          ...result,
          hint: 'Live tracker data. For synced dump (admin sync), use get_issue_snapshot.',
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_issue_snapshot',
    {
      description:
        'Read the Beer Tracker synced issue dump (`issue_snapshots` from admin Jira/Tracker sync). Offline/cached fields: summary, description, status, assignee, dates, syncedAt. Prefer get_issue for live comments/links.',
      inputSchema: {
        issueKey: z.string().min(1).describe('Tracker issue key, e.g. RND-123'),
      },
    },
    async ({ issueKey }) => {
      try {
        const result = await getIssueSnapshotForOrganization({
          issueKey,
          organizationId: input.organizationId,
        });
        return toolJson({
          ...result,
          hint: 'Snapshot from last org sync. Missing → run Admin → Sync / full rescan. Live detail: get_issue.',
        });
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
        'Dry-run a Beer Tracker planning patch (positions, links, feature drafts, goals). By default createNote writes draft sticky notes immediately (translucent until apply), and position ops draw translucent cards on the board until apply: a new placement, a date move, a duration change, or deletePosition (removal from the planner sprint, original card stays until apply). set persistNotes=false for a pure dry-run (notes and position cards created only on apply). Notes do NOT reserve capacity. Preflight fails if updateNote/deleteNote/updateGoal/deleteGoal targets are missing. upsertPosition places tasks; set syncToTracker=true to also add the issue to the tracker sprint and assign. Returns summary, schedule, capacityPreview, warnings, persistNotes, draftNoteIds, applyToken (TTL 30m). Always call before apply_plan_patch. Part indices must be 0..meta.partsPerDay-1. Notes expose updatedAt/updatedBy/version — pass ifVersion on updateNote for optimistic lock.',
      inputSchema: {
        ops: SprintPlanPatchOpsSchema.describe(
          '1–50 ops: upsertPosition|deletePosition|createNote|updateNote|deleteNote|upsertLink|deleteLink|upsertFeatureDraft|createGoal|updateGoal|deleteGoal'
        ),
        persistNotes: z
          .boolean()
          .optional()
          .describe(
            'Default true: write translucent createNote drafts and position-change cards now. false: dry-run only; those writes run on apply.'
          ),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ ops, persistNotes, sprintId }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) {
          return toolError(new Error(denied));
        }
        const clientBrand = input.mcpClientId ? await resolveRegisteredMcpClientBrand(input.mcpClientId) : undefined;
        const result = await proposeSprintPlanPatch({
          actorUserId: input.userId,
          clientBrand,
          ops,
          organizationId: input.organizationId,
          persistNotes,
          sprintId,
        });
        const hint = result.persistNotes
          ? 'Review the translucent draft notes on the planner (and summary/capacityPreview), then call apply_plan_patch with the same ops + applyToken and confirm=true.'
          : 'Review summary/capacityPreview/schedule (no draft notes written). Call apply_plan_patch with the same ops + applyToken and confirm=true to write.';
        return toolJson({
          ...result,
          hint,
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
        'Apply a previously proposed plan patch. Requires confirm=true and the applyToken from propose_plan_patch (same ops). Confirms draft notes (if any) and writes remaining ops. onError=stop (default) halts on first failure; onError=continue applies remaining ops and reports per-op errors. upsertPosition with syncToTracker=true adds the issue to the tracker sprint and assigns (BT position is always written even if tracker sync fails). Returns schedule + capacity. Not silent — refuse without confirm.',
      inputSchema: {
        applyToken: z.string().min(1).describe('Token from propose_plan_patch'),
        confirm: z
          .literal(true)
          .describe('Must be true — explicit approval to write'),
        onError: z
          .enum(['continue', 'stop'])
          .optional()
          .describe('stop (default): halt on first failed op. continue: apply remaining ops.'),
        ops: SprintPlanPatchOpsSchema.describe('Exact ops array from propose_plan_patch'),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ applyToken, confirm, onError, ops, sprintId }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) {
          return toolError(new Error(denied));
        }
        const result = await applySprintPlanPatch({
          actorUserId: input.userId,
          applyToken,
          confirm,
          onError,
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

  registerRetroBoardMcpTools(server, input);

  return server;
}
