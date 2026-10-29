import { z } from 'zod';

/**
 * Скиллы агента — готовые сценарии в чате планера: человек выбирает скилл и пару параметров,
 * агент получает инструкцию в `get_agent_session.skill`. Подписи для UI — в i18n
 * (`agentSession.skills.<id>`), инструкции агенту — здесь, по-английски, как подсказки MCP.
 */
type AgentSkillId = 'balance_load' | 'delegate_candidates' | 'place_tasks' | 'sprint_goals' | 'sprint_risks';

interface AgentSkillParam {
  /** Значение → что оно значит для агента. Первое — по умолчанию. */
  choices: Readonly<Record<string, string>>;
  id: string;
}

interface AgentSkill {
  icon: string;
  id: AgentSkillId;
  instructions: string;
  /** draft — результат драфтом на доске; reply — ответ текстом; candidates — список задач для агента. */
  output: 'candidates' | 'draft' | 'reply';
  params: readonly AgentSkillParam[];
}

export const AGENT_SKILLS: readonly AgentSkill[] = [
  {
    icon: 'users',
    id: 'balance_load',
    instructions:
      'Even out the load across people in the sprint. Start with get_sprint_capacity: find who is overloaded and who has free capacity, then propose a draft that moves positions (upsertPosition) so nobody is over capacity. Keep dependencies (links) in order and do not shorten estimates. In draftMessage list who was overloaded and what moved.',
    output: 'draft',
    params: [
      {
        choices: {
          yes: 'You may reassign tasks to other people (respect their role: dev tasks to developers, QA to testers).',
          no: 'Keep every task with its current assignee: only shift tasks in time.',
        },
        id: 'reassign',
      },
    ],
  },
  {
    icon: 'timeline',
    id: 'place_tasks',
    instructions:
      'Place the sprint tasks that have no position on the board yet onto swimlanes (upsertPosition). Use the assignee when the task has one, otherwise pick the person with free capacity (get_sprint_capacity). Do not move tasks that are already placed unless they block the new ones.',
    output: 'draft',
    params: [
      {
        choices: {
          priority: 'Order by priority: higher priority starts earlier.',
          dependencies: 'Order by dependencies first (links: blocked task after its blocker), then by priority.',
        },
        id: 'order',
      },
    ],
  },
  {
    icon: 'alert-triangle',
    id: 'sprint_risks',
    instructions:
      'Review the sprint and report risks without changing the plan: overloaded people, tasks that end after the sprint, broken dependency order, tasks without estimate or assignee, unfinished goals. Answer with reply_agent_session; for each risk name the tasks and a concrete fix. If the person may want a draft with the fixes, offer it with options.',
    output: 'reply',
    params: [
      {
        choices: {
          short: 'Keep it short: top 3–5 risks, one line each.',
          detailed: 'Be thorough: every risk you find, grouped by kind, with reasoning.',
        },
        id: 'detail',
      },
    ],
  },
  {
    icon: 'target',
    id: 'sprint_goals',
    instructions:
      'Propose sprint goals from the sprint tasks: 2–4 short, outcome-oriented goals (createGoal), each backed by real tasks of the sprint. Do not duplicate existing goals; suggest updateGoal when an existing goal is vague. In draftMessage say which tasks back each goal.',
    output: 'draft',
    params: [
      {
        choices: {
          delivery: 'Only delivery goals (what ships).',
          mixed: 'Delivery goals plus discovery goals where the sprint has research tasks.',
        },
        id: 'goalType',
      },
    ],
  },
  {
    icon: 'code',
    id: 'delegate_candidates',
    instructions:
      'Find tasks of this sprint that an AI coding agent could implement on its own and hand back as a branch for review. Read get_sprint_context (positions and unplannedTasks with statusCategory, estimates, links) and get_issue for the promising ones. Only work of this sprint: skip positions with inTrackerSprint=false (the card is on this board, but in the tracker the issue moved to another sprint) and say in the message which ones you skipped for that. A good candidate: a clear description with expected behaviour, a small estimate, no open questions or design/UX decisions to make, not blocked by another unfinished task (board arrows, tracker links), not a QA task, not research. Skip everything that needs a human decision. Answer with reply_agent_session(sessionId, message: one or two sentences — how many fit and what you skipped and why, candidates: [{taskKey, summary, reason}] — up to 8, best first; reason = one short line why it fits and what the risk is). If nothing fits, say why in the message and pass no candidates.',
    output: 'candidates',
    params: [
      {
        choices: {
          notStarted: 'Consider only tasks that are not started yet.',
          mine: 'Consider only not started tasks assigned to the person (whoami).',
        },
        id: 'scope',
      },
    ],
  },
];

const TASK_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/;

/** Задачи, которые агент предлагает отдать ему в работу (скилл «Что отдать агенту»). */
export const AgentTaskCandidatesSchema = z
  .array(
    z.object({
      reason: z.string().trim().min(1).max(300).describe('Why it fits and what the risk is, one short line'),
      summary: z.string().trim().min(1).max(300).describe('Task summary as in the tracker'),
      taskKey: z.string().trim().regex(TASK_KEY_RE).describe('Tracker issue key, e.g. RND-123'),
    })
  )
  .max(8);

export type AgentTaskCandidate = z.infer<typeof AgentTaskCandidatesSchema>[number];

/** Кандидаты из строки БД; битые — пропускаем. */
export function parseAgentTaskCandidates(raw: unknown): AgentTaskCandidate[] {
  const parsed = AgentTaskCandidatesSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

const SKILL_IDS = AGENT_SKILLS.map((skill) => skill.id) as [AgentSkillId, ...AgentSkillId[]];

export function findAgentSkill(id: string | null | undefined): AgentSkill | null {
  return AGENT_SKILLS.find((skill) => skill.id === id) ?? null;
}

/** Параметры по умолчанию: первый вариант каждого. */
export function defaultAgentSkillParams(skill: AgentSkill): Record<string, string> {
  return Object.fromEntries(skill.params.map((param) => [param.id, Object.keys(param.choices)[0] ?? '']));
}

/** Только известные параметры скилла; неизвестное значение — по умолчанию. */
function normalizeAgentSkillParams(skill: AgentSkill, raw: unknown): Record<string, string> {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const params = defaultAgentSkillParams(skill);
  for (const param of skill.params) {
    const value = record[param.id];
    if (typeof value === 'string' && value in param.choices) {
      params[param.id] = value;
    }
  }
  return params;
}

export interface AgentSessionSkill {
  id: AgentSkillId;
  params: Record<string, string>;
}

export const AgentSessionSkillSchema = z
  .object({
    id: z.enum(SKILL_IDS),
    params: z.record(z.string(), z.string()).default({}),
  })
  .transform((value): AgentSessionSkill => {
    const skill = findAgentSkill(value.id);
    return { id: value.id, params: skill ? normalizeAgentSkillParams(skill, value.params) : {} };
  });

/** Скилл из строки БД; незнакомый (удалённый) скилл — null. */
export function parseAgentSessionSkill(id: string | null, params: unknown): AgentSessionSkill | null {
  const skill = findAgentSkill(id);
  return skill ? { id: skill.id, params: normalizeAgentSkillParams(skill, params) } : null;
}

/** Что агент видит в `get_agent_session.skill`: инструкция с выбранными параметрами. */
export function buildAgentSkillAgentView(value: AgentSessionSkill) {
  const skill = findAgentSkill(value.id);
  if (!skill) {
    return null;
  }
  const choices = skill.params.flatMap((param) => {
    const text = param.choices[value.params[param.id] ?? ''];
    return text ? [text] : [];
  });
  return {
    id: skill.id,
    instructions: [skill.instructions, ...choices].join(' '),
    output: skill.output,
    params: value.params,
  };
}

const AGENT_REPLY_OPTION_MAX = 80;

/** Варианты ответа под репликой агента: человек отвечает кнопкой. */
export const AgentReplyOptionsSchema = z
  .array(z.string().trim().min(1).max(AGENT_REPLY_OPTION_MAX))
  .max(5);

/**
 * Какой вариант выбрал человек: его следующая реплика совпала с вариантом.
 * null — ещё не ответил или ответил своими словами.
 */
export function chosenAgentReplyOption(
  options: readonly string[],
  nextUserText: string | undefined
): string | null {
  const text = nextUserText?.trim();
  return text && options.includes(text) ? text : null;
}

/** «/» в начале пустого поля — запрос к списку скиллов («/рис» → «рис»); иначе null. */
export function agentSkillSlashQuery(text: string): string | null {
  const match = /^\/(\S*)$/.exec(text);
  return match ? (match[1] ?? '') : null;
}
