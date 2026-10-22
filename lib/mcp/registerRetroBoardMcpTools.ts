import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { canUsePlanner } from '@/lib/access/orgAccess';
import { findUserById } from '@/lib/auth/userRepository';
import {
  applyRetroBoardOpsForOrganization,
  getRetroBoardForOrganization,
} from '@/lib/mcp/retroBoardForOrganization';
import { RetroBoardOpsSchema } from '@/lib/mcp/retroBoardOps';

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

export function registerRetroBoardMcpTools(
  server: McpServer,
  input: {
    organizationId: string;
    profile: AccessProfile;
    userId: string;
  }
): void {
  server.registerTool(
    'get_retro_board',
    {
      description:
        'Read the sprint retrospective board: columns (id/preset/title) and cards (notes/agreements + comments). Each card: authorName (who created it) and reactions [{emoji, count, by: names}]; ✅ on a card = people marked it done (an agreement fulfilled, an item handled). Image cards omitted. If no board saved yet, returns the org template columns (createdFromTemplate=true) without writing.',
      inputSchema: {
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ sprintId }) => {
      try {
        const result = await getRetroBoardForOrganization({
          organizationId: input.organizationId,
          sprintId,
        });
        return toolJson({
          ...result,
          hint: 'Use columnPreset (glad/sad/discuss/meta/agreements/…) or columnId with apply_retro_board. Writes require confirm=true.',
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'apply_retro_board',
    {
      description:
        'Mutate the sprint retro board. Ops: addNote|updateNote|deleteCard|moveCard|addComment|deleteComment|addColumn|renameColumn|deleteColumn|moveColumn|convertToAgreement. Target columns by columnId or columnPreset. Requires confirm=true. Stops on first failed op. Creates board from org template on first write.',
      inputSchema: {
        confirm: z.literal(true).describe('Must be true — explicit approval to write'),
        ops: RetroBoardOpsSchema.describe('1–50 retro board ops'),
        sprintId: z.number().int().positive().describe('Tracker sprint id'),
      },
    },
    async ({ confirm, ops, sprintId }) => {
      try {
        const denied = plannerWriteDenied(input.profile);
        if (denied) {
          return toolError(new Error(denied));
        }
        const user = await findUserById(input.userId);
        const authorName = user?.display_name?.trim() || user?.email || 'MCP agent';
        const result = await applyRetroBoardOpsForOrganization({
          authorName,
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
}
