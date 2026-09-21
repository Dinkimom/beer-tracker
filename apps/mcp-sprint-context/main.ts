/**
 * MCP stdio server: thin client for GET /api/sprints/{id}/sprint-context.
 *
 * Env:
 *   BEER_TRACKER_URL              — base URL (e.g. http://localhost:3000)
 *   SPRINT_CONTEXT_MCP_SECRET     — same secret as on the BT instance
 *
 * No org_id: on-prem uses the single instance organization.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim() ?? '';
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function baseUrl(): string {
  let url = requireEnv('BEER_TRACKER_URL');
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}

function mcpSecret(): string {
  return requireEnv('SPRINT_CONTEXT_MCP_SECRET');
}

async function fetchSprintContext(sprintId: number, featureId?: string): Promise<unknown> {
  const url = new URL(`${baseUrl()}/api/sprints/${sprintId}/sprint-context`);
  if (featureId) {
    url.searchParams.set('featureId', featureId);
  }
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${mcpSecret()}`,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`sprint-context HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('sprint-context returned non-JSON body');
  }
}

const server = new McpServer({
  name: 'beer-tracker-sprint-context',
  version: '1.1.0',
});

server.registerTool(
  'get_sprint_context',
  {
    description:
      'Read-only Beer Tracker planning graph for a sprint: positions (day/part), feature lanes, notes (+ diagram text), task links, sprint goals, availability. Not a Tracker/Jira ticket proxy — use tracker MCP for issue status/summary.',
    inputSchema: {
      featureId: z
        .string()
        .optional()
        .describe('Optional feature lane id or tracker feature key to narrow the graph'),
      sprintId: z.number().int().positive().describe('Tracker sprint id'),
    },
  },
  async ({ featureId, sprintId }) => {
    try {
      const payload = await fetchSprintContext(sprintId, featureId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: message }],
        isError: true,
      };
    }
  }
);

async function main(): Promise<void> {
  // Validate env early so Cursor shows a clear failure instead of silent tool errors.
  baseUrl();
  mcpSecret();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
