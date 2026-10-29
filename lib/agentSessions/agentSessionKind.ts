import { z } from 'zod';

/**
 * Вид сессии: plan — просьба про план спринта (драфты на доске); dev — задача отдана агенту
 * в работу: он пишет код у себя и присылает результат (`result`). Что агент делает в сессии
 * каждого вида — в таблице ниже, остальное у видов общее.
 */
export type AgentSessionKind = 'dev' | 'plan';

export const AGENT_SESSION_KINDS = ['dev', 'plan'] as const satisfies readonly AgentSessionKind[];

/** Итог работы над задачей: ветка, коммиты и тесты — для человека, который будет смотреть diff. */
export const AgentDevResultSchema = z.object({
  branch: z.string().trim().min(1).max(200).describe('Branch with the work, e.g. agent/RND-123'),
  commits: z
    .array(
      z.object({
        sha: z.string().trim().min(4).max(40),
        subject: z.string().trim().min(1).max(200),
      })
    )
    .max(50)
    .default([])
    .describe('Commits on the branch, oldest first'),
  deletions: z.number().int().nonnegative().optional(),
  filesChanged: z.number().int().nonnegative().optional(),
  insertions: z.number().int().nonnegative().optional(),
  /** Что из задачи осталось несделанным: человек может попросить доделать пункт одной кнопкой. */
  openItems: z
    .array(z.string().trim().min(1).max(300))
    .max(10)
    .default([])
    .describe('What of the task is NOT done (out of scope, blocked, needs a decision) — one short item each; empty if everything is done'),
  tests: z.enum(['failed', 'not_run', 'passed']).describe('Result of the project checks you ran'),
});

export type AgentDevResult = z.infer<typeof AgentDevResultSchema>;

/** Результат из строки БД; битый — null (сообщение покажется обычным текстом). */
export function parseAgentDevResult(value: unknown): AgentDevResult | null {
  const parsed = AgentDevResultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const PLAN_HINT =
  'A work session with a person. Read conversation top to bottom: kind=request is what they asked, kind=message is a follow-up — any of their messages may carry mentions = tasks/people/notes they pointed at (task id → taskIds, person id → assigneeId, note id → notes[].id); the latest unanswered message is what to do now, comment = their remark on one item of your draft (target), redo = "redo the draft", draft = a version you proposed. Start with fetchContext. To change the plan: propose_plan_patch(sessionId, replacePending: true, replies: [...]) — replies answer openComments (resolution addressed|declined + what you did). To answer without a new draft: reply_agent_session. skill = a preset the person invoked in the planner (top-level skill = the one waiting for you; each conversation item keeps its own): follow skill.instructions (output draft → propose_plan_patch, reply → reply_agent_session). When a real choice belongs to the person (two ways to fix a conflict, what to drop), ask with reply_agent_session(message, options: 2–5 short answers) — their pick comes back as the next message. Never apply_plan_patch for the person — they accept the draft on the board.';

const DEV_HINT =
  'A development session: the person handed you task taskId to implement in code. Start with fetchContext (get_task_brief): description, comments, what it depends on, notes and diagrams from the board. Then transition_issue(target: in_progress). Work in the repository on a separate branch named agent/<taskId>, follow the project rules (AGENTS.md / CLAUDE.md), run the project checks named in your prompt before committing (if a check cannot run, say which and why and set tests: not_run), commit. Do not push and do not open a pull request — the person reviews the branch first. When done: reply_agent_session(sessionId, message: what you did and what to look at, result: {branch, commits, tests, filesChanged, insertions, deletions, openItems — what of the task is not done}), then transition_issue(target: review, comment: branch and a short summary). If the task is unclear or blocked, ask with reply_agent_session(message, options) instead of guessing. Later messages in the conversation are follow-ups on the same branch. Never change the sprint plan from this session.';

/** Что агент получает в сессии каждого вида: подсказку и первый вызов. */
export const AGENT_SESSION_KIND_BEHAVIOR: Readonly<
  Record<AgentSessionKind, { fetchContext: (input: { sprintId: number; taskId: string | null }) => string | null; hint: string }>
> = {
  dev: {
    fetchContext: ({ sprintId, taskId }) => (taskId ? `get_task_brief(issueKey: "${taskId}", sprintId: ${sprintId})` : null),
    hint: DEV_HINT,
  },
  plan: { fetchContext: () => null, hint: PLAN_HINT },
};
