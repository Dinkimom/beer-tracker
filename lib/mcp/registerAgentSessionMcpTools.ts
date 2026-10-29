import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import { canUsePlanner } from '@/lib/access/orgAccess';
import {
  AgentSessionRepliesSchema,
  buildAgentSessionAgentView,
  summarizeAgentSessionForAgent,
  waitingForDraftSessionId,
} from '@/lib/agentSessions/agentSession';
import { AgentDevResultSchema } from '@/lib/agentSessions/agentSessionKind';
import { draftSessionIdsBySprint, replyAgentSession } from '@/lib/agentSessions/agentSessionService';
import {
  findAgentSessionByProposal,
  getAgentSession,
  listAgentSessions,
} from '@/lib/agentSessions/agentSessionsRepository';
import { AgentReplyOptionsSchema, AgentTaskCandidatesSchema } from '@/lib/agentSessions/agentSkills';
import { toolError, toolJson } from '@/lib/mcp/mcpToolResult';
import { resolveRegisteredMcpClientBrand } from '@/lib/mcp/oauth/mcpOAuthService';


const INBOX_HINT =
  'Your inbox: sessions the person handed to you from the Beer Tracker planner ("Ask the agent", 💬 on your draft, "Ask to redo"). Open each with get_agent_session, do the work, then answer: propose_plan_patch(sessionId, …) for a plan change or reply_agent_session for a text answer. One draft per sprint at a time: a session with waitsForDraftSession cannot propose a draft until that session draft is accepted/rejected — handle the draft session first. kind=dev = a task handed to you to implement in code (follow that session hint; drafts do not apply); kind=plan = a planning request. Sessions are private to the person you act for.';

/** Для get_sprint_context: сессия, в которой лежит текущий драфт владельца. */
export async function loadDraftAgentSessionSummary(input: {
  organizationId: string;
  ownerId: string;
  proposalId: string | null;
  sprintId: number;
}) {
  if (!input.proposalId) {
    return null;
  }
  const sessionId = await findAgentSessionByProposal({
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    proposalId: input.proposalId,
    sprintId: input.sprintId,
  });
  if (!sessionId) {
    return null;
  }
  const session = await getAgentSession({
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    sessionId,
  });
  return session ? summarizeAgentSessionForAgent(session) : null;
}

export function registerAgentSessionMcpTools(
  server: McpServer,
  input: { mcpClientId?: string; organizationId: string; profile: AccessProfile; userId: string }
): void {
  server.registerTool(
    'list_agent_sessions',
    {
      description:
        'Your inbox of work sessions from the Beer Tracker planner. Call it when the person says "look at my requests / what is waiting for you". Default status=waiting_agent (handed to you and not answered yet). Each row: title, sprintId, taskId, context (task key, summary, assignee), openComments, draftVersion. Then get_agent_session(sessionId).',
      inputSchema: {
        sprintId: z.number().int().positive().optional().describe('Only sessions of this sprint'),
        status: z
          .enum(['waiting_agent', 'open', 'all'])
          .optional()
          .describe('waiting_agent (default) · open = not closed · all = including closed in the last 7 days'),
      },
    },
    async ({ sprintId, status }) => {
      try {
        let statuses: Array<'closed' | 'waiting_agent' | 'waiting_user'> | undefined = ['waiting_agent'];
        if (status === 'open') {
          statuses = ['waiting_agent', 'waiting_user'];
        } else if (status === 'all') {
          statuses = undefined;
        }
        const sessions = await listAgentSessions({
          organizationId: input.organizationId,
          ownerId: input.userId,
          sprintId,
          statuses,
        });
        const draftBySprint = await draftSessionIdsBySprint({
          organizationId: input.organizationId,
          ownerId: input.userId,
          sprintIds: sessions.map((session) => session.sprintId),
        });
        return toolJson({
          hint: INBOX_HINT,
          sessions: sessions.map((session) => {
            const waitsFor = waitingForDraftSessionId(session, draftBySprint);
            return {
              ...summarizeAgentSessionForAgent(session),
              ...(draftBySprint.get(session.sprintId) === session.id ? { hasDraftOnBoard: true } : {}),
              ...(waitsFor ? { waitsForDraftSession: waitsFor } : {}),
            };
          }),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_agent_session',
    {
      description:
        'One work session (kind=plan: a planning request; kind=dev: a task to implement in code — hint says how): what the person asked (request), your drafts (draft), their 💬 on draft items (comment, with target position/goal/note), "redo" requests and your replies. openComments lists 💬 ids waiting for your answer. fetchContext is the get_sprint_context call to start with.',
      inputSchema: {
        sessionId: z.string().uuid().describe('Session id from list_agent_sessions or get_sprint_context.agentSession'),
      },
    },
    async ({ sessionId }) => {
      try {
        const session = await getAgentSession({
          organizationId: input.organizationId,
          ownerId: input.userId,
          sessionId,
        });
        if (!session) {
          return toolError(new Error('agent_session_not_found'));
        }
        return toolJson(buildAgentSessionAgentView(session));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'reply_agent_session',
    {
      description:
        'Answer in a session without a new draft: a clarifying question, an explanation, "done" for a non-plan request, or replies to 💬 you decline. For plan changes use propose_plan_patch(sessionId, replies) instead. close=true when the request is fully done and nothing is left on the board. options = 2–5 short answers the person picks with one click (a fork only they can decide); the pick comes back as their next message. result (kind=dev sessions only) = the finished work: branch, commits, tests — message then says what you did and what to review. The session then waits for the person.',
      inputSchema: {
        close: z.boolean().optional().describe('Close the session (request done)'),
        message: z.string().max(2000).optional().describe('Text for the person'),
        options: AgentReplyOptionsSchema.optional().describe(
          'Answer buttons under message, e.g. ["Move RND-12 to Masha", "Postpone to next sprint"]. Needs message; not with close'
        ),
        replies: AgentSessionRepliesSchema.optional().describe(
          'Answers to openComments: [{messageId, resolution: addressed|declined, text}]'
        ),
        result: AgentDevResultSchema.optional().describe('Development session only: the finished work. Needs message'),
        candidates: AgentTaskCandidatesSchema.optional().describe(
          'Skill delegate_candidates: sprint tasks an AI coding agent could implement on its own, best first. The planner shows them with checkboxes and "hand off selected". Needs message'
        ),
        sessionId: z.string().uuid().describe('Session id'),
      },
    },
    async ({ candidates, close, message, options, replies, result, sessionId }) => {
      try {
        if (!canUsePlanner(input.profile)) {
          return toolError(new Error('forbidden: planner write requires organization admin or team membership'));
        }
        if (!message?.trim() && !replies?.length && !close) {
          return toolError(new Error('validation_failed: pass message, replies or close'));
        }
        if (options?.length && (!message?.trim() || close)) {
          return toolError(new Error('validation_failed: options need a message and an open session (no close)'));
        }
        if (result && !message?.trim()) {
          return toolError(new Error('validation_failed: result needs a message: what you did and what to review'));
        }
        const clientBrand = input.mcpClientId ? await resolveRegisteredMcpClientBrand(input.mcpClientId) : undefined;
        const session = await replyAgentSession({
          clientBrand,
          close,
          message,
          options,
          organizationId: input.organizationId,
          ownerId: input.userId,
          replies: replies ?? [],
          result,
          candidates,
          sessionId,
        });
        return toolJson(summarizeAgentSessionForAgent(session));
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
