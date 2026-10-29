import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { canUsePlanner } from '@/lib/access/orgAccess';
import { findUserById } from '@/lib/auth/userRepository';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { toolError, toolJson } from '@/lib/mcp/mcpToolResult';
import { resolvePersonMcpHits } from '@/lib/mcp/resolvePersonMcpHits';


/** Своя строка на доске: карточка сотрудника с тем же email, что у пользователя продукта. */
async function findSelfAssignee(organizationId: string, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const hits = await resolvePersonMcpHits(organizationId, normalized);
  return hits.find((hit) => hit.email?.trim().toLowerCase() === normalized) ?? null;
}

function trackerIdMismatchWarning(
  self: { assigneeId: string; trackerId: string | null },
  trackerUser: { trackerUid?: number | string; uid?: number | string }
): string | null {
  const trackerUid = String(trackerUser.trackerUid ?? trackerUser.uid ?? '').trim();
  if (!trackerUid || trackerUid === self.trackerId) {
    return null;
  }
  return `staff_not_linked_to_tracker: on the board you are ${self.assigneeId}, in the tracker ${trackerUid}. Tracker issues assigned to ${trackerUid} will not match your swimlane; an org admin should set this tracker user id on your staff card (Admin → Staff).`;
}

/** trackerUser из /myself и, если id в трекере не совпадает с id на доске, предупреждение. */
async function loadTrackerSelf(
  organizationId: string,
  self: { assigneeId: string; trackerId: string | null } | null
): Promise<Record<string, unknown>> {
  try {
    const issueTracker = await getIssueTrackerProviderClientForOrganization(organizationId);
    const trackerUser = await issueTracker.getCurrentUser();
    const mismatch = self ? trackerIdMismatchWarning(self, trackerUser) : null;
    return { trackerUser, ...(mismatch ? { warnings: [mismatch] } : {}) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { trackerUserWarning: `tracker_myself_unavailable: ${message}` };
  }
}

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
        'Current Beer Tracker MCP identity: product userId, email/displayName, orgRole, canUsePlanner; me = your planner identity (assigneeId used in positions/teamMembers/capacity, staffUid, trackerId or null when the staff card is not linked to the tracker); optionally the tracker /myself. With includeTracker, warnings flag when the tracker id differs from the board id.',
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
        const self = await findSelfAssignee(input.organizationId, user?.email);
        const payload: Record<string, unknown> = {
          canUsePlanner: canUsePlanner(input.profile),
          displayName: user?.display_name || null,
          email: user?.email || null,
          me: self
            ? { assigneeId: self.assigneeId, staffUid: self.staffUid, trackerId: self.trackerId }
            : null,
          organizationId: input.organizationId,
          orgRole: input.profile.orgRole,
          userId: input.userId,
          ...(includeTracker ? await loadTrackerSelf(input.organizationId, self) : {}),
        };
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
          hint: 'Use assigneeId from the hit for positions/notes/capacity (tracker id when linked, else staff:uuid). trackerLinked=false: the staff card has no tracker user, so in the tracker (Jira) and in unplannedTasks this person shows up under a different id — match by name/email, never assign by that id. role/roleTitle/platforms come from team_members when the person is on a team.',
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
