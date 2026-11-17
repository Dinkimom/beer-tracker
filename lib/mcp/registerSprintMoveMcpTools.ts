import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { plannerWriteDenied, toolError, toolJson } from '@/lib/mcp/mcpToolResult';
import { moveIssuesForOrganization } from '@/lib/sprints/issueSprintMove';

/** Перенос задач между спринтами сразу, без черновика (docs/BUSINESS_RULES.md, K8). */
export function registerSprintMoveMcpTools(
  server: McpServer,
  input: { organizationId: string; profile: AccessProfile }
): void {
  server.registerTool(
    'move_issues_to_sprint',
    {
      description:
        'Move tracker issues to another sprint (sprintId) or to the backlog (toBacklog=true) right away — no draft, no approval on the board. ' +
        'The tracker and the Beer Tracker boards change together, like «Move to sprint» in the planner: the issue goes to the target sprint in the tracker; ' +
        'its card and Beer Tracker arrows leave the boards of every open sprint other than the target (also stale cards left by earlier moves made outside Beer Tracker); ' +
        'a card already in the target sprint is cleared, so the issue lands in that sprint unplanned (get_sprint_context unplannedTasks; place it with propose_plan_patch upsertPosition). ' +
        'If the tracker already had the issue in the target sprint, nothing moves there and its card stays (trackerUnchanged); stale cards in other open sprints are still cleared. ' +
        'Closed sprints keep their cards (history). ' +
        'ALWAYS use this instead of moving issues between sprints in Jira / the tracker directly (tracker MCP or API): a move made there leaves the Beer Tracker card behind, ' +
        'and the sprint board and the quarterly plan then show the issue in the wrong sprint. ' +
        'Issues are moved one by one; a failed issue reports its error and does not stop the rest; if the tracker refuses, the boards are not touched. ' +
        'Returns per issue: ok, clearedSprintIds (boards the card left), trackerUnchanged, error. Not silent — requires confirm=true.',
      inputSchema: {
        confirm: z.literal(true).describe('Must be true — explicit approval to move now'),
        issueKeys: z.array(z.string().trim().min(1).max(80)).min(1).max(50).describe('Tracker issue keys to move, e.g. ["RND-123"]'),
        sprintId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Target tracker sprint id (search_sprints). Give either sprintId or toBacklog'),
        toBacklog: z.literal(true).optional().describe('Move out of sprints to the backlog instead of a sprint'),
      },
    },
    async ({ issueKeys, sprintId, toBacklog }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) return toolError(new Error(denied));
        if ((sprintId === undefined) === (toBacklog === undefined)) {
          return toolError(new Error('give exactly one of sprintId or toBacklog'));
        }
        const results = await moveIssuesForOrganization({
          issueKeys,
          organizationId: input.organizationId,
          target: sprintId === undefined ? { backlog: true } : { sprintId },
        });
        return toolJson({ moved: results.filter((result) => result.ok).length, results });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
