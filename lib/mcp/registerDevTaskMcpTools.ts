import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { getIssueForOrganization } from '@/lib/mcp/getIssueForOrganization';
import { loadMcpSprintContext } from '@/lib/mcp/mcpSprintContextWithDraft';
import { plannerWriteDenied, toolError, toolJson } from '@/lib/mcp/mcpToolResult';
import { buildTaskBriefPlanning } from '@/lib/mcp/taskBrief';
import { transitionIssueByTeamFlow } from '@/lib/mcp/transitionIssueForOrganization';

/** Тулы для агента разработки: задача целиком перед тем, как писать код, и шаги по флоу команды. */
export function registerDevTaskMcpTools(
  server: McpServer,
  input: {
    organizationId: string;
    profile: AccessProfile;
    userId: string;
  }
): void {
  server.registerTool(
    'get_task_brief',
    {
      description:
        'Everything needed to start coding one task, in one call. issue: live tracker detail (description, comments, tracker links). planning: what only the Beer Tracker board knows — plan (assignee, schedule window, status; null if the task is not in this sprint), dependsOn (tasks with a board arrow into this one: do or check them first), blocks (tasks waiting for this one), feature (other tasks of the same parent or board feature draft), notes (sticky notes and diagrams: linked = arrow to the task, parent = about the task or its feature, nearby = on the assignee lane during the task window), sprintGoals. Use before implementing a task from an agent session.',
      inputSchema: {
        issueKey: z.string().min(1).describe('Tracker issue key, e.g. RND-123'),
        sprintId: z.number().int().positive().describe('Tracker sprint id of the board the task is planned on'),
      },
    },
    async ({ issueKey, sprintId }) => {
      try {
        const key = issueKey.trim();
        const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
        const [issue, context] = await Promise.all([
          getIssueForOrganization({ issueKey: key, issueTracker }),
          loadMcpSprintContext({ organizationId: input.organizationId, sprintId, viewerUserId: input.userId }),
        ]);
        const planning = buildTaskBriefPlanning(context, key);
        const warnings = [...issue.warnings, ...(planning.plan ? [] : [`task_not_in_sprint: ${key} in ${sprintId}`])];
        return toolJson({ issue: issue.issue, planning, warnings });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'transition_issue',
    {
      description:
        'Move a task along the team workflow: target=in_progress when you start coding, target=review when the work is ready. The status is not named by you: it is learned from the status history of neighbouring tasks (same queue, this and the previous sprint of the board) — the status tasks most often enter work through, and the one they most often go to next. When the history is thin or split (reason not_enough_history / ambiguous), the team closes tasks straight from work (no_review_stage), there is no transition from the current status, or the transition screen has required fields, the status is left as is and outcome.reason says why. comment is posted to the tracker issue in every case — put the branch name and a short summary there on review. Never use it to close a task.',
      inputSchema: {
        comment: z.string().max(4000).optional().describe('Tracker comment to post (e.g. branch, commits, what was done)'),
        issueKey: z.string().min(1).describe('Tracker issue key, e.g. RND-123'),
        sprintId: z.number().int().positive().describe('Tracker sprint id of the board the task is planned on'),
        target: z.enum(['in_progress', 'review']).describe('Workflow step to move the task to'),
      },
    },
    async ({ comment, issueKey, sprintId, target }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) {
          return toolError(new Error(denied));
        }
        const result = await transitionIssueByTeamFlow({
          comment,
          issueKey,
          organizationId: input.organizationId,
          sprintId,
          target,
        });
        return toolJson(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
