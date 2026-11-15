import type { AccessProfile } from '@/lib/access/orgAccess';
import type { QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { AgentSessionRepliesSchema } from '@/lib/agentSessions/agentSession';
import { quarterScope } from '@/lib/agentSessions/agentSessionScope';
import { AvailabilityEventOpsSchema, applyAvailabilityEventOps } from '@/lib/boardAvailability/boardAvailabilityEventOps';
import {
  boardAvailabilityEventFromRow,
  listBoardAvailabilityEvents,
} from '@/lib/boardAvailability/boardAvailabilityEventsRepository';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { plannerWriteDenied, toolError, toolJson, toolOpsResult } from '@/lib/mcp/mcpToolResult';
import { resolveRegisteredMcpClientBrand } from '@/lib/mcp/oauth/mcpOAuthService';
import { loadDraftAgentSessionSummary } from '@/lib/mcp/registerAgentSessionMcpTools';
import { loadQuarterlyPlanDraft, proposeQuarterlyPlan } from '@/lib/quarterlyPlans/quarterlyPlanDrafts';
import { planIssueKeys } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QuarterlyPlanOpsSchema } from '@/lib/quarterlyPlans/quarterlyPlanOps';
import {
  findQuarterlyPlanProblems,
  getQuarterlyPlan,
  loadQuarterlyPlanTeams,
} from '@/lib/quarterlyPlans/quarterlyPlanService';
import { buildQuarterWeeks } from '@/lib/quarterlyPlans/quarterWeeks';

const quarterInput = {
  quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).describe('Quarter number 1–4'),
  year: z.number().int().min(2000).max(2100),
};

const WRITE_HINT =
  'Change the plan with propose_quarterly_plan (ifVersion = version) — the person accepts the draft on the board. People: teams[].members[].id (resolve names with resolve_person). ' +
  'Tracker links: a direction is a tracker epic (search_tracker_epics, link with updateDirection.issue); a plan epic is any ' +
  'tracker issue, usually a task inside that epic (search_issues, link with addEpic.issueKey or updateEpic.issue). ' +
  'Absences: apply_availability_events.';

/**
 * Квартальный план для агентов (раздел 11 docs/QUARTERLY_PLAN_RULES.md): чтение, пакет правок плана
 * и отсутствия людей. Цель — перенести квартальный роадмэп из таблицы целиком.
 */
export function registerQuarterlyPlanMcpTools(
  server: McpServer,
  input: { mcpClientId?: string; organizationId: string; profile: AccessProfile; userId: string }
): void {
  server.registerTool(
    'get_quarterly_plan',
    {
      description:
        "Read the organization's quarterly plan: weeks (index + Mon–Fri dates), teams (id, boardId, members, sprints), " +
        'directions (milestones; issueKey = linked tracker epic), epics (issueKey = linked tracker issue, status, title; ' +
        'for every linked key trackerEpics[issueKey] has the tracker title, status and done), assignments (person × row × weeks; the row is ' +
        'an epic (epicId) or the direction itself (directionId); phase "discovery" marks research, no phase = delivery), links ' +
        '(fromId must finish before toId starts), notes, absences per team, issues (assignments where the person is away, ' +
        'works on another epic the same weeks, starts before a blocker ends, or left the team), dutyRiskAssignmentIds ' +
        '(on duty during the assignment: a risk, not a problem), pendingProposal (your draft the person has not accepted yet — ' +
        'the plan above is without it) with its agentSession, and version. Optional teamId narrows the result.',
      inputSchema: { ...quarterInput, teamId: z.string().optional().describe('teams[].id to narrow the plan') },
    },
    async ({ quarter, teamId, year }) => {
      try {
        const ref: QuarterRef = { quarter, year };
        const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
        const { plan, version } = await getQuarterlyPlan({ issueTracker, organizationId: input.organizationId, ref });
        const teams = plan.teams.filter((team) => !teamId || team.id === teamId);
        const directions = plan.directions.filter((direction) => teams.some((team) => team.id === direction.teamId));
        const epics = plan.epics.filter((epic) => directions.some((direction) => direction.id === epic.directionId));
        const owner = { organizationId: input.organizationId, ownerId: input.userId, ref };
        const [findings, pendingProposal] = await Promise.all([findQuarterlyPlanProblems(plan), loadQuarterlyPlanDraft(owner)]);
        const agentSession = pendingProposal
          ? await loadDraftAgentSessionSummary({ ...owner, proposalId: pendingProposal.proposalId, scope: quarterScope(ref) })
          : null;
        const inTeams = new Set(teams.map((team) => team.id));
        const absences = await Promise.all(
          teams.map(async (team) => ({
            events: (await listBoardAvailabilityEvents(team.boardId)).map(boardAvailabilityEventFromRow),
            teamId: team.id,
          }))
        );
        return toolJson({
          absences,
          assignments: plan.assignments.filter(
            (assignment) =>
              epics.some((epic) => epic.id === assignment.epicId) ||
              directions.some((direction) => direction.id === assignment.directionId)
          ),
          directions,
          epics,
          dutyRiskAssignmentIds: findings.dutyRiskAssignmentIds,
          hint: WRITE_HINT,
          issues: findings.issues.filter((issue) => inTeams.has(issue.teamId)),
          links: plan.links,
          notes: plan.notes,
          // Твой черновик, который человек ещё не принял: план выше — без него.
          ...(pendingProposal
            ? {
                pendingProposal: {
                  createdAt: pendingProposal.createdAt,
                  error: pendingProposal.error,
                  proposalId: pendingProposal.proposalId,
                  summary: pendingProposal.summary,
                },
              }
            : {}),
          ...(agentSession ? { agentSession } : {}),
          quarter,
          teams,
          trackerEpics: Object.fromEntries(
            planIssueKeys({ directions, epics }).flatMap((key) =>
              plan.trackerEpics[key] ? [[key, plan.trackerEpics[key]]] : []
            )
          ),
          version,
          weeks: buildQuarterWeeks(ref).map(({ endDate, index, startDate }) => ({ endDate, index, startDate })),
          year,
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'propose_quarterly_plan',
    {
      description:
        'Propose a change to the quarterly plan as a draft the person accepts or rejects as a whole on the quarterly board ' +
        '(you cannot write the plan yourself). Batch of ops, all or nothing: addDirection|updateDirection|removeDirection|' +
        'addEpic|updateEpic|removeEpic|assign|updateAssignment|removeAssignment|addLink|removeLink|addNote|updateNote|removeNote. ' +
        'Give created entities a ref like "$epic1" and use it in later ops of the same batch. Spans: {startWeek, weeks} ' +
        'or {startDate, endDate}. assign takes epicId or directionId: put discovery (research before the feature is split into epics) ' +
        'on the direction, delivery on its epics; phase overrides the default. A person must be in the row team. addDirection with an existing title reuses it; addEpic ' +
        'with an issueKey already in the plan fails with the existing epic id. Pass ifVersion from get_quarterly_plan. ' +
        'The draft is checked against the plan now and re-applied to the current plan when accepted. One draft per person ' +
        'per quarter: a different draft needs replacePending: true. Pass sessionId when working on a session from ' +
        'list_agent_sessions; replies answer its openComments. Returns the issues and duty risks of the resulting plan.',
      inputSchema: {
        ...quarterInput,
        draftMessage: z.string().max(2000).optional().describe('One or two sentences for the person: what this draft does and why'),
        ifVersion: z.number().int().min(0).describe('version from get_quarterly_plan'),
        intent: z.string().max(300).optional().describe('What the person asked for — titles a new session'),
        ops: QuarterlyPlanOpsSchema.describe('1–200 ops'),
        replacePending: z.boolean().optional().describe('Replace an unreviewed draft of yours in this quarter'),
        replies: AgentSessionRepliesSchema.optional().describe('Answers to the session openComments'),
        sessionId: z.string().uuid().optional().describe('Agent session id from list_agent_sessions'),
      },
    },
    async ({ draftMessage, ifVersion, intent, ops, quarter, replacePending, replies, sessionId, year }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) return toolError(new Error(denied));
        const clientBrand = input.mcpClientId ? await resolveRegisteredMcpClientBrand(input.mcpClientId) : undefined;
        const result = await proposeQuarterlyPlan({
          clientBrand,
          draftMessage,
          ifVersion,
          intent,
          ops,
          organizationId: input.organizationId,
          ownerId: input.userId,
          ref: { quarter, year },
          replacePending,
          replies,
          sessionId,
        });
        if (result.status === 'invalid') {
          return toolError(new Error('opIndex' in result && result.opIndex != null ? `op ${result.opIndex}: ${result.error}` : result.error));
        }
        if (result.status === 'conflict') {
          return toolError(new Error(`version conflict: the plan is at version ${result.version}; re-read and rebuild the batch`));
        }
        return toolJson({
          ...result,
          hint: 'The draft is on the quarterly board. The person accepts or rejects it; their comments come back in the session.',
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'apply_availability_events',
    {
      description:
        'Add, update or remove absences (vacation, sick_leave, tech_sprint with techSprintSubtype, duty) for people of a team. ' +
        'These are the same events the sprint board shows. Ops run in order and stop at the first error; earlier ops stay applied. ' +
        'teamId and memberId come from get_quarterly_plan; event ids from its absences. Requires confirm=true.',
      inputSchema: {
        confirm: z.literal(true).describe('Must be true — explicit approval to write'),
        ops: AvailabilityEventOpsSchema.describe('1–100 ops'),
      },
    },
    async ({ ops }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) return toolError(new Error(denied));
        const teams = await loadQuarterlyPlanTeams(input.organizationId);
        const result = await applyAvailabilityEventOps({
          actorUserId: input.userId,
          ops,
          organizationId: input.organizationId,
          teams,
        });
        return toolOpsResult(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'search_tracker_epics',
    {
      description:
        'Find tracker epics by key or title in the project of a team board — the same search as linking a direction on the board. ' +
        'A tracker epic is a plan direction: link it with updateDirection {directionId, issue: {issueKey, title}}. ' +
        'Plan epics link to tracker tasks (search_issues). A linked row takes its title from the tracker.',
      inputSchema: {
        boardId: z.number().int().positive().describe('teams[].boardId from get_quarterly_plan'),
        query: z.string().trim().min(1).describe('Epic key or words from its title'),
      },
    },
    async ({ boardId, query }) => {
      try {
        const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
        const issues = await issueTracker.searchIssuesOnBoard(boardId, query, { parentCandidates: true });
        return toolJson({
          epics: issues.map((issue) => ({
            issueKey: issue.key,
            status: issue.status?.display ?? issue.status?.key ?? null,
            title: issue.summary,
            type: issue.type?.display ?? null,
          })),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
