import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { canUsePlanner } from '@/lib/access/orgAccess';
import { findUserById } from '@/lib/auth/userRepository';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { toolError, toolJson } from '@/lib/mcp/mcpToolResult';
import { resolvePersonMcpHits } from '@/lib/mcp/resolvePersonMcpHits';


export function registerIdentityMcpTools(
  server: McpServer,
  input: {
    organizationId: string;
    profile: AccessProfile;
    userId: string;
  }
): void {
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
    'resolve_person',
    {
      description:
        'Resolve a person by name/email/tracker id fragment to staffUid + assigneeId for capacity/context matching, plus team role (developer|tester|other), roleTitle, and platforms when they are on a team. Query must be at least 2 characters.',
      inputSchema: {
        query: z
          .string()
          .min(2)
          .describe('Substring of display name, email, or tracker user id'),
      },
    },
    async ({ query: queryText }) => {
      try {
        const hits = await resolvePersonMcpHits(input.organizationId, queryText);
        return toolJson({
          hits,
          hint: 'Prefer assigneeId from the hit (tracker id when linked, else staff:uuid). role/roleTitle/platforms come from team_members when the person is on a team.',
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
