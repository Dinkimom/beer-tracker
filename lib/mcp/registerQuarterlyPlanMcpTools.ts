import type { AccessProfile } from '@/lib/access/orgAccess';
import type { QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { AvailabilityEventOpsSchema, applyAvailabilityEventOps } from '@/lib/boardAvailability/boardAvailabilityEventOps';
import {
  boardAvailabilityEventFromRow,
  listBoardAvailabilityEvents,
} from '@/lib/boardAvailability/boardAvailabilityEventsRepository';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { plannerWriteDenied, toolError, toolJson } from '@/lib/mcp/mcpToolResult';
import { QuarterlyPlanOpsSchema } from '@/lib/quarterlyPlans/quarterlyPlanOps';
import {
  applyQuarterlyPlanOps,
  getQuarterlyPlan,
  loadQuarterlyPlanTeams,
} from '@/lib/quarterlyPlans/quarterlyPlanService';
import { buildQuarterWeeks } from '@/lib/quarterlyPlans/quarterWeeks';

const quarterInput = {
  quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).describe('Quarter number 1–4'),
  year: z.number().int().min(2000).max(2100),
};

const WRITE_HINT =
  'Write with apply_quarterly_plan (ifVersion = version). People: teams[].members[].id (resolve names with resolve_person). ' +
  'Epics from the tracker: find keys with search_issues. Absences: apply_availability_events.';

/**
 * Квартальный план для агентов (раздел 11 docs/QUARTERLY_PLAN_RULES.md): чтение, пакет правок плана
 * и отсутствия людей. Цель — перенести квартальный роадмэп из таблицы целиком.
 */
export function registerQuarterlyPlanMcpTools(
  server: McpServer,
  input: { organizationId: string; profile: AccessProfile; userId: string }
): void {
  server.registerTool(
    'get_quarterly_plan',
    {
      description:
        "Read the organization's quarterly plan: weeks (index + Mon–Fri dates), teams (id, boardId, members, sprints), " +
        'directions (milestones), epics (issueKey, status, title; for linked epics trackerEpics[issueKey] has the tracker ' +
        'title, status and done), assignments (person × epic × weeks), links ' +
        '(fromId must finish before toId starts), notes, absences per team, and version. Optional teamId narrows the result.',
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
        const absences = await Promise.all(
          teams.map(async (team) => ({
            events: (await listBoardAvailabilityEvents(team.boardId)).map(boardAvailabilityEventFromRow),
            teamId: team.id,
          }))
        );
        return toolJson({
          absences,
          assignments: plan.assignments.filter((assignment) => epics.some((epic) => epic.id === assignment.epicId)),
          directions,
          epics,
          hint: WRITE_HINT,
          links: plan.links,
          notes: plan.notes,
          quarter,
          teams,
          trackerEpics: Object.fromEntries(
            epics.flatMap((epic) =>
              epic.issueKey && plan.trackerEpics[epic.issueKey] ? [[epic.issueKey, plan.trackerEpics[epic.issueKey]]] : []
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
    'apply_quarterly_plan',
    {
      description:
        'Change the quarterly plan with a batch of ops, all or nothing: addDirection|renameDirection|removeDirection|' +
        'addEpic|updateEpic|removeEpic|assign|updateAssignment|removeAssignment|addLink|removeLink|addNote|updateNote|removeNote. ' +
        'Give created entities a ref like "$epic1" and use it in later ops of the same batch. Spans: {startWeek, weeks} ' +
        'or {startDate, endDate}. A person must be in the epic team. addDirection with an existing title reuses it; addEpic ' +
        'with an issueKey already in the plan fails with the existing epic id. Pass ifVersion from get_quarterly_plan; ' +
        'on conflict re-read. dryRun=true returns the result without writing; writes need confirm=true.',
      inputSchema: {
        ...quarterInput,
        confirm: z.boolean().optional().describe('Must be true to write (not needed for dryRun)'),
        dryRun: z.boolean().optional(),
        ifVersion: z.number().int().min(0).describe('version from get_quarterly_plan'),
        ops: QuarterlyPlanOpsSchema.describe('1–200 ops'),
      },
    },
    async ({ confirm, dryRun = false, ifVersion, ops, quarter, year }) => {
      try {
        if (!dryRun) {
          const denied = plannerWriteDenied(input.profile);
          if (denied) return toolError(new Error(denied));
          if (confirm !== true) return toolError(new Error('confirm=true is required to write; use dryRun to preview'));
        }
        const result = await applyQuarterlyPlanOps({
          dryRun,
          ifVersion,
          ops,
          organizationId: input.organizationId,
          ref: { quarter, year },
        });
        if (result.status === 'invalid') return toolError(new Error(`op ${result.opIndex ?? '?'}: ${result.error}`));
        if (result.status === 'conflict') {
          return toolError(new Error(`version conflict: the plan is at version ${result.version}; re-read and rebuild the batch`));
        }
        return toolJson(result);
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
        return result.ok ? toolJson(result) : toolError(new Error(`op ${result.opIndex}: ${result.error}; applied before it: ${JSON.stringify(result.applied)}`));
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
