import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { isOrganizationAdminProfile } from '@/lib/access/orgAccess';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { toolError, toolJson, toolOpsResult } from '@/lib/mcp/mcpToolResult';
import {
  applyTeamCompositionOps,
  loadTeamComposition,
  TeamCompositionOpsSchema,
} from '@/lib/staffTeams/teamCompositionOps';

const ADMIN_ONLY = 'forbidden: changing team composition requires organization admin';

/**
 * Состав команд для агентов: прочитать может любой участник организации, менять — только администратор,
 * как в админке команд (`canManageTeamInAdmin`).
 */
export function registerTeamCompositionMcpTools(
  server: McpServer,
  input: { organizationId: string; profile: AccessProfile }
): void {
  const isAdmin = isOrganizationAdminProfile(input.profile);

  server.registerTool(
    'get_team_composition',
    {
      description:
        'Teams of the organization with their members (staffId, name, email, trackerUserId, roleSlug) and the role ' +
        'catalog (roles[].slug, title). canEdit says whether the caller (organization admin) may change composition ' +
        'with apply_team_composition. Optional teamId narrows the result.',
      inputSchema: { teamId: z.string().uuid().optional().describe('teams[].id to narrow the result') },
    },
    async ({ teamId }) => {
      try {
        return toolJson({ ...(await loadTeamComposition(input.organizationId, teamId)), canEdit: isAdmin });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'search_tracker_users',
    {
      description:
        'Find tracker users by name or email to add to a team when they are not in the organization yet ' +
        '(people already in the organization: resolve_person). Returns trackerUserId, displayName, email. Organization admin only.',
      inputSchema: { query: z.string().trim().min(2).describe('Name or email fragment') },
    },
    async ({ query }) => {
      try {
        if (!isAdmin) return toolError(new Error(ADMIN_ONLY));
        const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
        const users = await issueTracker.searchUsers(query);
        return toolJson({
          users: users.map((user) => ({ displayName: user.displayName, email: user.email ?? null, trackerUserId: user.trackerId })),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'apply_team_composition',
    {
      description:
        'Change team composition: addMember (staffId of a person in the organization, or trackerUserId [+ email, ' +
        'displayName] from search_tracker_users — the person gets a staff card and planner access), setRole ' +
        '(roleSlug from roles[], null clears), removeMember. Ops run in order and stop at the first error; earlier ' +
        'ops stay applied. Organization admin only; requires confirm=true.',
      inputSchema: {
        confirm: z.literal(true).describe('Must be true — explicit approval to write'),
        ops: TeamCompositionOpsSchema.describe('1–50 ops'),
      },
    },
    async ({ ops }) => {
      try {
        if (!isAdmin) return toolError(new Error(ADMIN_ONLY));
        const result = await applyTeamCompositionOps({ ops, organizationId: input.organizationId });
        return toolOpsResult(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
