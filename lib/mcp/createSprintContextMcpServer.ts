import type { AccessProfile } from '@/lib/access/orgAccess';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { canUsePlanner } from '@/lib/access/orgAccess';
import { AgentSessionRepliesSchema } from '@/lib/agentSessions/agentSession';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { getIssueForOrganization } from '@/lib/mcp/getIssueForOrganization';
import { getIssueSnapshotForOrganization } from '@/lib/mcp/getIssueSnapshotForOrganization';
import { loadMcpSprintContext, withPendingProposal } from '@/lib/mcp/mcpSprintContextWithDraft';
import { resolveRegisteredMcpClientBrand } from '@/lib/mcp/oauth/mcpOAuthService';
import { registerAgentSessionMcpTools } from '@/lib/mcp/registerAgentSessionMcpTools';
import { registerIdentityMcpTools } from '@/lib/mcp/registerIdentityMcpTools';
import { registerRetroBoardMcpTools } from '@/lib/mcp/registerRetroBoardMcpTools';
import { searchIssuesForOrganization } from '@/lib/mcp/searchIssuesForOrganization';
import { searchSprintsForOrganization } from '@/lib/mcp/searchSprintsForOrganization';
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import { SprintPlanPatchOpsSchema } from '@/lib/sprints/sprintPlanPatchSchema';
import {
  applySprintPlanPatch,
  proposeSprintPlanPatch,
} from '@/lib/sprints/sprintPlanPatchService';

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
    version: '1.12.0',
  });

  registerIdentityMcpTools(server, input);
  registerAgentSessionMcpTools(server, input);

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
        'Read-only Beer Tracker planning graph for a sprint: positions (day/part + planVsActual + status/statusCategory/sprintHistory), capacity (tasks only; sticky notes do not reserve time), unplannedTasks (issues in the tracker sprint with no position on the board yet — the sprint backlog in the planner; same statusCategory/assignee fields; place them with propose_plan_patch upsertPosition), teamMembers (board roster with role=developer|tester|other, roleTitle, platforms), feature lanes, notes, links, goals, availability. positions and sprintGoals are the committed board. pendingProposal, when present, is an unconfirmed propose_plan_patch (translucent cards): positions[].beforeSchedule→afterSchedule and goals[].beforeText→afterText. Draft notes are notes[] with pendingApproval=true. notes[] carry width (parts from day/part), height (swimlane rows) and color (text notes) — see meta.legend.note; notes of one assignee that overlap in time get stacked into extra rows. Drafts are private: pendingProposal is only your own draft; agentSession is the session it belongs to (openComments = 💬 waiting for your reply — read them with get_agent_session). Prefer assigneeId/taskIds to keep the payload small. Filter “in work” via statusCategory (not-started|in-progress|paused|done), not raw statusType. meta.calendarDays are Mon–Fri columns (day index). meta.weekendDays are Sat/Sun with no day index — do not plan there. meta.holidayCountry is the org Settings → Holiday calendar country; meta.holidayDays are that calendar’s non-working weekdays (same day index, unavailable in capacity). Requires numeric tracker sprintId — call search_sprints first if only a name is known.',
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
        const payload = await loadMcpSprintContext({
          assigneeId,
          featureId,
          organizationId: input.organizationId,
          sprintId,
          taskIds,
          viewerUserId: input.userId,
        });
        return toolJson(await withPendingProposal(payload, input.userId));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_sprint_capacity',
    {
      description:
        'Capacity analysis for a sprint: per-person load vs free parts (meta.partsPerDay from org settings), overlaps, gaps, overloaded days; includes teamMembers roster with roles when board is known. Sticky notes do not reserve capacity — only task positions. meta.weekendDays are Sat/Sun (no day index). meta.holidayCountry comes from org Settings → Holiday calendar; meta.holidayDays for that country are unavailable for everyone — free gaps and totalMaxParts already exclude them. Prefer this over raw positions when answering "who is overloaded / where is free capacity".',
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
        const payload = await loadMcpSprintContext({
          assigneeId,
          featureId,
          organizationId: input.organizationId,
          sprintId,
          viewerUserId: input.userId,
        });
        return toolJson({
          capacity: payload.capacity ?? buildSprintContextCapacity(payload),
          meta: {
            calendarDays: payload.meta.calendarDays,
            featureId: payload.meta.featureId,
            holidayCountry: payload.meta.holidayCountry,
            holidayDays: payload.meta.holidayDays,
            partsPerDay: payload.meta.partsPerDay,
            sprintId: payload.meta.sprintId,
            sprintWindow: payload.meta.sprintWindow,
            warnings: payload.meta.warnings,
            weekendDays: payload.meta.weekendDays,
          },
          ...(payload.teamMembers && payload.teamMembers.length > 0
            ? { teamMembers: payload.teamMembers }
            : {}),
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
        const payload = await loadMcpSprintContext({
          featureId,
          organizationId: input.organizationId,
          sprintId,
          viewerUserId: input.userId,
        });
        return toolJson(await withPendingProposal(payload, input.userId));
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
    'propose_plan_patch',
    {
      description:
        'Dry-run a Beer Tracker planning patch (positions, links, feature drafts, goals). By default createNote writes draft sticky notes immediately (translucent until apply), and position ops draw translucent cards on the board until apply: a new placement, a date move, a duration change, segment split (upsertPosition.segments), or deletePosition (removal from the planner sprint, original card stays until apply). To ADD a task to the plan (including already split into gaps): one upsertPosition with startDay/startPart/duration and optional segments[{startDay,startPart,duration},…]; set syncToTracker=true when the issue is not yet on the tracker sprint (propose returns issue_not_in_sprint + hints — re-propose with syncToTracker, then apply). If the hint says the issue is already on the planner, the move still applies without syncToTracker. To only re-split a task already on the board: pass segments without syncToTracker. Envelope rules: startDay/startPart = segments[0]; duration = sum(segments[].duration); segments=[] clears the split. A second propose with different ops does NOT silently replace an unconfirmed proposal — pass replacePending=true to discard it (or apply/reject first). The conflict error lists the pending positions, goals, and draft notes. Same ops re-propose is idempotent. persistNotes=false for pure dry-run (warns if a pending proposal is already on the board). Notes do NOT reserve capacity. warnings include note_overlap when a created/moved note overlaps another note of the same assignee in time (the lane grows taller); it names the first free slot. Preflight fails if updateNote/deleteNote/updateGoal/deleteGoal targets are missing. Returns summary (was→became, including note/goal text), schedule + scheduleBefore, positionChanges[{taskId,kind,before,after,beforeSchedule,afterSchedule,changes}], contentChanges[{op,kind,beforeText,afterText}] for notes and goals, capacityPreview, warnings, hints, persistNotes, draftNoteIds, applyToken (TTL 30m). Read get_sprint_context.pendingProposal before a second propose — positions there stay the committed board. Pass sessionId when working on a session from list_agent_sessions; replies answer its openComments. Without sessionId the draft goes to the session of your current draft, or a new session titled by intent. Always call before apply_plan_patch. Part indices 0..meta.partsPerDay-1. Notes: updatedAt/updatedBy/version — pass ifVersion on updateNote for optimistic lock.',
      inputSchema: {
        draftMessage: z
          .string()
          .max(2000)
          .optional()
          .describe('One or two sentences for the person: what this draft version does and why. Shown in the session.'),
        intent: z
          .string()
          .max(300)
          .optional()
          .describe('What the person asked for, in their words — titles a new session when there is no sessionId and no current draft.'),
        ops: SprintPlanPatchOpsSchema.describe(
          '1–50 ops: upsertPosition (optional segments[], syncToTracker)|deletePosition|createNote|updateNote|deleteNote|upsertLink|deleteLink|upsertFeatureDraft|createGoal|updateGoal|deleteGoal'
        ),
        persistNotes: z
          .boolean()
          .optional()
          .describe(
            'Default true: write translucent createNote drafts and position-change cards now. false: dry-run only; those writes run on apply.'
          ),
        replies: AgentSessionRepliesSchema.optional().describe(
          'Answers to the session openComments: [{messageId, resolution: addressed|declined, text}] — what you changed or why not.'
        ),
        replacePending: z
          .boolean()
          .optional()
          .describe(
            'Required when a different unconfirmed proposal is already on the board and persistNotes=true. true discards that pending draft/previews before writing this one.'
          ),
        sessionId: z.string().uuid().optional().describe('Agent session id from list_agent_sessions / get_agent_session'),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ draftMessage, intent, ops, persistNotes, replacePending, replies, sessionId, sprintId }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) {
          return toolError(new Error(denied));
        }
        const clientBrand = input.mcpClientId ? await resolveRegisteredMcpClientBrand(input.mcpClientId) : undefined;
        const result = await proposeSprintPlanPatch({
          actorUserId: input.userId,
          draftMessage,
          intent,
          clientBrand,
          ops,
          organizationId: input.organizationId,
          persistNotes,
          replacePending,
          replies,
          sessionId,
          sprintId,
        });
        const reviewHint = result.persistNotes
          ? 'Review translucent drafts on the planner plus summary/scheduleBefore→schedule/positionChanges/capacityPreview, then call apply_plan_patch with the same ops + applyToken and confirm=true.'
          : 'Review summary/scheduleBefore→schedule/positionChanges/capacityPreview (no draft notes written). Call apply_plan_patch with the same ops + applyToken and confirm=true to write.';
        const hint =
          result.hints && result.hints.length > 0
            ? `${result.hints.join(' ')} ${reviewHint}`
            : reviewHint;
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
        'Apply a previously proposed plan patch. Requires confirm=true and the applyToken from propose_plan_patch (same ops). The patch is applied in one transaction: draft notes are confirmed and ops written together. onError=stop (default): any failed op rolls back the whole patch (rolledBack=true, nothing applied; the token stays usable for a retry). onError=continue: a failed op is skipped, the rest are applied and per-op errors reported. Each applyToken works once: a repeat returns already_applied — propose again for a new token. upsertPosition with syncToTracker=true adds the issue to the tracker sprint and assigns after the patch is saved (a tracker failure is a warning on that op; the BT position stays). Returns schedule + capacity. Not silent — refuse without confirm.',
      inputSchema: {
        applyToken: z.string().min(1).describe('Token from propose_plan_patch'),
        confirm: z
          .literal(true)
          .describe('Must be true — explicit approval to write'),
        onError: z
          .enum(['continue', 'stop'])
          .optional()
          .describe('stop (default): roll back the whole patch on the first failed op. continue: skip failed ops, apply the rest.'),
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
