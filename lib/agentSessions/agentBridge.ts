import type { AgentBridgeRepoSettings, AgentBridgeRunTarget } from '@/lib/agentSessions/agentBridgeDev';

/**
 * Локальный мост к Claude CLI (`pnpm agent-bridge`): планер зовёт его, когда сессия ждёт агента,
 * мост запускает `claude -p` с MCP Beer Tracker. Здесь — общее для моста и планера, без Node и React.
 */

export const AGENT_BRIDGE_DEFAULT_PORT = 47821;

export const AGENT_BRIDGE_DEFAULT_URL = `http://127.0.0.1:${AGENT_BRIDGE_DEFAULT_PORT}`;

/** Что агент делает сейчас — по последнему событию из потока CLI. */
export type AgentBridgeStep =
  | 'coding'
  | 'committing'
  | 'connecting'
  | 'drafting'
  | 'exploring'
  | 'reading'
  | 'replying'
  | 'running'
  | 'searching'
  | 'starting'
  | 'studying'
  | 'thinking';

interface AgentBridgeRun {
  sessionId: string;
  /** Время старта по часам моста (та же машина, что и браузер). */
  startedAt: number;
  step: AgentBridgeStep;
}

/** Чем кончился последний прогон по сессии: время по часам моста, ошибка и последний текст агента. */
export interface AgentBridgeFinishedRun {
  at: number;
  error?: string;
  sessionId: string;
  text: string;
}

export const AGENT_BRIDGE_FINISHED_TEXT_MAX = 600;

interface AgentBridgeHealth {
  /** Очереди задач, для которых у моста есть репозиторий: их сессии разработки он берёт сам. */
  devQueues: string[];
  finished: AgentBridgeFinishedRun[];
  /** Запуски CLI, которые идут сейчас. */
  runs: AgentBridgeRun[];
}

const AGENT_BRIDGE_STEPS: readonly AgentBridgeStep[] = [
  'coding',
  'committing',
  'connecting',
  'drafting',
  'exploring',
  'reading',
  'replying',
  'running',
  'searching',
  'starting',
  'studying',
  'thinking',
];

const TOOL_STEPS: Readonly<Record<string, AgentBridgeStep>> = {
  ToolSearch: 'connecting',
  WebFetch: 'reading',
  whoami: 'reading',
  list_agent_sessions: 'reading',
  get_agent_session: 'reading',
  get_sprint_context: 'studying',
  get_sprint_capacity: 'studying',
  get_feature_context: 'studying',
  get_retro_board: 'studying',
  search_sprints: 'searching',
  search_issues: 'searching',
  get_issue: 'searching',
  get_issue_snapshot: 'searching',
  resolve_person: 'searching',
  propose_plan_patch: 'drafting',
  apply_retro_board: 'drafting',
  reply_agent_session: 'replying',
  get_task_brief: 'reading',
  transition_issue: 'replying',
  Read: 'exploring',
  Glob: 'exploring',
  Grep: 'exploring',
  Edit: 'coding',
  Write: 'coding',
  NotebookEdit: 'coding',
  'notion-search': 'searching',
  'notion-query-meeting-notes': 'searching',
  'notion-fetch': 'reading',
  'notion-get-self': 'reading',
};

/** Шаг агента по вызванному тулу MCP (с префиксом клиента `mcp__server__tool` или без). */
export function agentStepForTool(name: string): AgentBridgeStep {
  const short = name.split('__').at(-1) ?? name;
  return TOOL_STEPS[short] ?? 'thinking';
}

interface StreamContentBlock {
  input?: { command?: unknown };
  name?: unknown;
  type?: unknown;
}

/** Команда в Bash: коммит отдельно, остальное — «запускает команды» (тесты, линтер, git). */
function bashStep(block: StreamContentBlock): AgentBridgeStep {
  const command = typeof block.input?.command === 'string' ? block.input.command : '';
  return /\bgit\s+commit\b/.test(command) ? 'committing' : 'running';
}

/**
 * Строка `claude -p --output-format stream-json` → шаг агента. Шаг даёт только ответ модели:
 * вызов тула — по имени тула, текст или размышление — «думает». Прочие события — null.
 */
export function agentBridgeStepFromStreamLine(line: string): AgentBridgeStep | null {
  let event: { message?: { content?: unknown }; type?: unknown };
  try {
    event = JSON.parse(line) as typeof event;
  } catch {
    return null;
  }
  const content = event.type === 'assistant' ? event.message?.content : null;
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }
  const tool = (content as StreamContentBlock[]).findLast((block) => block.type === 'tool_use');
  if (tool?.name === 'Bash') {
    return bashStep(tool);
  }
  return typeof tool?.name === 'string' ? agentStepForTool(tool.name) : 'thinking';
}

/** Токены прогона CLI для лога моста; `costUsd` — условная цена по прайсу API, есть только в итоге. */
interface AgentBridgeUsage {
  cacheRead: number;
  cacheWrite: number;
  costUsd: number | null;
  input: number;
  output: number;
}

const EMPTY_USAGE: AgentBridgeUsage = { cacheRead: 0, cacheWrite: 0, costUsd: null, input: 0, output: 0 };

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function agentBridgeUsageTotal(usage: AgentBridgeUsage): number {
  return usage.input + usage.cacheRead + usage.cacheWrite + usage.output;
}

function addUsage(a: AgentBridgeUsage, b: AgentBridgeUsage): AgentBridgeUsage {
  return {
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    costUsd: a.costUsd ?? b.costUsd,
    input: a.input + b.input,
    output: a.output + b.output,
  };
}

/** `usage` хода модели в формате API. */
function usageFromApi(raw: Record<string, unknown>): AgentBridgeUsage {
  return {
    cacheRead: count(raw.cache_read_input_tokens),
    cacheWrite: count(raw.cache_creation_input_tokens),
    costUsd: null,
    input: count(raw.input_tokens),
    output: count(raw.output_tokens),
  };
}

/** Итог прогона: `modelUsage` по всем моделям (CLI зовёт и вспомогательную), цена — `total_cost_usd`. */
function usageFromResult(event: Record<string, unknown>): AgentBridgeUsage {
  const models = Object.values((event.modelUsage ?? {}) as Record<string, Record<string, unknown>>);
  const total = models.reduce<AgentBridgeUsage>(
    (sum, model) =>
      addUsage(sum, {
        cacheRead: count(model.cacheReadInputTokens),
        cacheWrite: count(model.cacheCreationInputTokens),
        costUsd: null,
        input: count(model.inputTokens),
        output: count(model.outputTokens),
      }),
    EMPTY_USAGE
  );
  const usage = agentBridgeUsageTotal(total) > 0 ? total : usageFromApi((event.usage ?? {}) as Record<string, unknown>);
  return { ...usage, costUsd: typeof event.total_cost_usd === 'number' ? event.total_cost_usd : null };
}

/** Подсчёт токенов по потоку CLI: ходы модели по id сообщения (CLI повторяет usage на каждый блок), затем итог. */
export interface AgentBridgeUsageTally {
  final: AgentBridgeUsage | null;
  turns: Readonly<Record<string, AgentBridgeUsage>>;
}

export const EMPTY_AGENT_BRIDGE_USAGE_TALLY: AgentBridgeUsageTally = { final: null, turns: {} };

export function tallyAgentBridgeUsage(tally: AgentBridgeUsageTally, line: string): AgentBridgeUsageTally {
  let event: Record<string, unknown> & { message?: { id?: unknown; usage?: unknown }; type?: unknown };
  try {
    event = JSON.parse(line) as typeof event;
  } catch {
    return tally;
  }
  if (event.type === 'result') {
    return { ...tally, final: usageFromResult(event) };
  }
  const { id, usage } = event.message ?? {};
  if (event.type !== 'assistant' || typeof id !== 'string' || !usage || typeof usage !== 'object') {
    return tally;
  }
  return { ...tally, turns: { ...tally.turns, [id]: usageFromApi(usage as Record<string, unknown>) } };
}

export function agentBridgeTallyUsage(tally: AgentBridgeUsageTally): AgentBridgeUsage {
  return tally.final ?? Object.values(tally.turns).reduce(addUsage, EMPTY_USAGE);
}

/** Шаг из внешних данных (ответ моста, строка БД); незнакомый — «думает». */
export function parseAgentBridgeStep(value: unknown): AgentBridgeStep {
  return AGENT_BRIDGE_STEPS.includes(value as AgentBridgeStep) ? (value as AgentBridgeStep) : 'thinking';
}

function parseAgentBridgeRun(value: unknown): AgentBridgeRun | null {
  const run = value as Partial<AgentBridgeRun> | null;
  if (!run || !isAgentSessionId(run.sessionId) || typeof run.startedAt !== 'number') {
    return null;
  }
  return { sessionId: run.sessionId, startedAt: run.startedAt, step: parseAgentBridgeStep(run.step) };
}

function parseAgentBridgeFinishedRun(value: unknown): AgentBridgeFinishedRun | null {
  const run = value as Partial<AgentBridgeFinishedRun> | null;
  if (!run || !isAgentSessionId(run.sessionId) || typeof run.at !== 'number') {
    return null;
  }
  return {
    at: run.at,
    ...(typeof run.error === 'string' && run.error ? { error: run.error } : {}),
    sessionId: run.sessionId,
    text: typeof run.text === 'string' ? run.text.slice(-AGENT_BRIDGE_FINISHED_TEXT_MAX) : '',
  };
}

/**
 * Прогон моста кончился, а сессия всё ещё ждёт агента: агент не ответил в чат (упал, не нашёл
 * тулов, закончил молча). Прогон должен быть позже последней реплики человека — иначе это итог
 * прошлого запуска. null — показывать нечего (агент работает, ответил или прогона не было).
 */
export function agentBridgeUnansweredRun(
  session: { id: string; messages: ReadonlyArray<{ authorKind: string; createdAt: string }>; status: string },
  health: { finished: readonly AgentBridgeFinishedRun[]; runs: readonly AgentBridgeRun[] }
): AgentBridgeFinishedRun | null {
  if (session.status !== 'waiting_agent' || health.runs.some((run) => run.sessionId === session.id)) {
    return null;
  }
  const run = health.finished.find((item) => item.sessionId === session.id);
  const lastAsk = session.messages.findLast((message) => message.authorKind === 'user');
  return run && (!lastAsk || run.at > Date.parse(lastAsk.createdAt)) ? run : null;
}

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAgentSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

/**
 * Чтение, предложение плана и запись в ретро. План агенту не применяем: это делает человек на доске.
 * У ретро шага «предложить» нет, поэтому `apply_retro_board` агент вызывает сам.
 */
const BRIDGE_ALLOWED_TOOLS = [
  'whoami',
  'search_sprints',
  'get_sprint_context',
  'get_sprint_capacity',
  'get_feature_context',
  'get_issue',
  'get_issue_snapshot',
  'search_issues',
  'resolve_person',
  'get_retro_board',
  'apply_retro_board',
  'list_agent_sessions',
  'get_agent_session',
  'propose_plan_patch',
  'reply_agent_session',
] as const;

const BRIDGE_DENIED_TOOLS = ['apply_plan_patch'] as const;

/**
 * Notion через коннектор claude.ai — только поиск и чтение: саммари дейли, заметки встреч, страницы
 * по ссылке из чата. Если коннектор не подключён, этих тулов в CLI просто нет.
 */
const BRIDGE_NOTION_TOOLS = ['notion-search', 'notion-fetch', 'notion-query-meeting-notes', 'notion-get-self'].map(
  (name) => `mcp__claude_ai_Notion__${name}`
);

function agentBridgePrompt(sessionId: string, mcpServer: string): string {
  return [
    `Обработай сессию ${sessionId} в Beer Tracker.`,
    // Подключено может быть несколько стендов BT: сессия есть только на этом.
    `Из тулов Beer Tracker используй только mcp__${mcpServer}__*.`,
    'Ссылки из сообщений читай через WebFetch.',
    'Ссылки на Notion и поиск по Notion (саммари дейли, заметки встреч) — через mcp__claude_ai_Notion__*.',
    'Прочитай её через get_agent_session и подтяни fetchContext.',
    `Если план нужно менять — propose_plan_patch с sessionId ${sessionId}, replacePending: true, ответами на комментарии в replies и draftMessage.`,
    'Если просят записать на доску ретро — get_retro_board, затем apply_retro_board с confirm: true; итог сообщи через reply_agent_session.',
    'Если в сессии есть skill — следуй skill.instructions.',
    'Если менять нечего — ответь через reply_agent_session.',
    'Если решить может только человек — спроси через reply_agent_session с options: короткие варианты-кнопки.',
    'План не применяй: решение принимает человек на доске.',
  ].join(' ');
}

export const AGENT_BRIDGE_DEFAULT_MODEL = 'sonnet';

/**
 * Аргументы `claude` для одной сессии; `mcpServer` — имя сервера Beer Tracker в конфиге CLI.
 * Из встроенных инструментов Claude Code — только `ToolSearch` и `WebFetch`: MCP-тулы в CLI отложенные
 * и без `ToolSearch` не подгружаются, `WebFetch` читает ссылки из чата. Остальные инструменты и skills
 * мосту не нужны, а их описания едут в контекст каждого шага (замер на whoami, Sonnet: ~140k → ~80k
 * токенов за прогон).
 */
export function agentBridgeClaudeArgs(sessionId: string, mcpServer: string, model: string): string[] {
  const tool = (name: string) => `mcp__${mcpServer}__${name}`;
  return [
    '-p',
    agentBridgePrompt(sessionId, mcpServer),
    '--model',
    model,
    '--tools',
    'ToolSearch,WebFetch',
    '--disable-slash-commands',
    // Поток событий: мост видит каждый шаг агента и показывает его в планере.
    '--output-format',
    'stream-json',
    '--verbose',
    '--allowedTools',
    ['ToolSearch', 'WebFetch', ...BRIDGE_ALLOWED_TOOLS.map(tool), ...BRIDGE_NOTION_TOOLS].join(','),
    '--disallowedTools',
    BRIDGE_DENIED_TOOLS.map(tool).join(','),
  ];
}

/** Host только loopback на порту моста — защита от DNS rebinding. */
export function isAgentBridgeHostAllowed(host: string | undefined, port: number): boolean {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

/**
 * `AGENT_BRIDGE_TARGETS`: «адрес планера=MCP-сервер» через запятую. У каждого стенда свой MCP
 * (локальный — `beer-tracker-dev`, прод — коннектор claude.ai `claude_ai_BeerTracker`).
 * Запросы с Origin не из списка мост отклоняет: иначе любой открытый сайт мог бы запускать CLI.
 */
export function parseAgentBridgeTargets(raw: string): Map<string, string> {
  const targets = new Map<string, string>();
  for (const entry of raw.split(',')) {
    const [origin = '', mcpServer = ''] = entry.split('=').map((part) => part.trim());
    const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    if (normalized && mcpServer) {
      targets.set(normalized, mcpServer);
    }
  }
  return targets;
}

export async function fetchAgentBridgeHealth(baseUrl: string): Promise<AgentBridgeHealth | null> {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { devQueues?: unknown; finished?: unknown; runs?: unknown };
    const runs = Array.isArray(data.runs) ? data.runs.map(parseAgentBridgeRun) : [];
    const devQueues = Array.isArray(data.devQueues) ? data.devQueues.filter((queue) => typeof queue === 'string') : [];
    const finished = Array.isArray(data.finished) ? data.finished.map(parseAgentBridgeFinishedRun) : [];
    return {
      devQueues,
      finished: finished.filter((run): run is AgentBridgeFinishedRun => run != null),
      runs: runs.filter((run): run is AgentBridgeRun => run != null),
    };
  } catch {
    return null;
  }
}

export async function runAgentBridgeSession(baseUrl: string, target: AgentBridgeRunTarget): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/run`, {
      body: JSON.stringify(target),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchAgentBridgeRepos(baseUrl: string): Promise<AgentBridgeRepoSettings | null> {
  try {
    const response = await fetch(`${baseUrl}/repos`);
    return response.ok ? ((await response.json()) as AgentBridgeRepoSettings) : null;
  } catch {
    return null;
  }
}

/** Сохранить репозитории в мосте; ошибка проверки (не git, кривая очередь) — текстом исключения. */
export async function saveAgentBridgeRepos(
  baseUrl: string,
  repos: ReadonlyArray<{ path: string; queues: string[] }>
): Promise<AgentBridgeRepoSettings> {
  const response = await fetch(`${baseUrl}/repos`, {
    body: JSON.stringify({ repos }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  const data = (await response.json()) as AgentBridgeRepoSettings & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `bridge ${response.status}`);
  }
  return data;
}
