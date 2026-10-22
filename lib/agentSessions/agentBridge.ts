/**
 * Локальный мост к Claude CLI (`pnpm agent-bridge`): планер зовёт его, когда сессия ждёт агента,
 * мост запускает `claude -p` с MCP Beer Tracker. Здесь — общее для моста и планера, без Node и React.
 */

export const AGENT_BRIDGE_DEFAULT_PORT = 47821;

export const AGENT_BRIDGE_DEFAULT_URL = `http://127.0.0.1:${AGENT_BRIDGE_DEFAULT_PORT}`;

/** Что агент делает сейчас — по последнему событию из потока CLI. */
export type AgentBridgeStep =
  | 'connecting'
  | 'drafting'
  | 'reading'
  | 'replying'
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

interface AgentBridgeHealth {
  /** Запуски CLI, которые идут сейчас. */
  runs: AgentBridgeRun[];
}

const AGENT_BRIDGE_STEPS: readonly AgentBridgeStep[] = [
  'connecting',
  'drafting',
  'reading',
  'replying',
  'searching',
  'starting',
  'studying',
  'thinking',
];

const TOOL_STEPS: Readonly<Record<string, AgentBridgeStep>> = {
  ToolSearch: 'connecting',
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
};

function stepForTool(name: string): AgentBridgeStep {
  const short = name.split('__').at(-1) ?? name;
  return TOOL_STEPS[short] ?? 'thinking';
}

interface StreamContentBlock {
  name?: unknown;
  type?: unknown;
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
  return typeof tool?.name === 'string' ? stepForTool(tool.name) : 'thinking';
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

function parseAgentBridgeRun(value: unknown): AgentBridgeRun | null {
  const run = value as Partial<AgentBridgeRun> | null;
  if (!run || !isAgentSessionId(run.sessionId) || typeof run.startedAt !== 'number') {
    return null;
  }
  const step = AGENT_BRIDGE_STEPS.includes(run.step as AgentBridgeStep) ? (run.step as AgentBridgeStep) : 'thinking';
  return { sessionId: run.sessionId, startedAt: run.startedAt, step };
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

function agentBridgePrompt(sessionId: string, mcpServer: string): string {
  return [
    `Обработай сессию ${sessionId} в Beer Tracker.`,
    // Подключено может быть несколько стендов BT: сессия есть только на этом.
    `Используй только тулы mcp__${mcpServer}__*.`,
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
 * Из встроенных инструментов Claude Code — только `ToolSearch`: MCP-тулы в CLI отложенные и без него
 * не подгружаются. Остальные инструменты и skills мосту не нужны, а их описания едут в контекст
 * каждого шага (замер на whoami, Sonnet: ~140k → ~80k токенов за прогон).
 */
export function agentBridgeClaudeArgs(sessionId: string, mcpServer: string, model: string): string[] {
  const tool = (name: string) => `mcp__${mcpServer}__${name}`;
  return [
    '-p',
    agentBridgePrompt(sessionId, mcpServer),
    '--model',
    model,
    '--tools',
    'ToolSearch',
    '--disable-slash-commands',
    // Поток событий: мост видит каждый шаг агента и показывает его в планере.
    '--output-format',
    'stream-json',
    '--verbose',
    '--allowedTools',
    ['ToolSearch', ...BRIDGE_ALLOWED_TOOLS.map(tool)].join(','),
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
    const data = (await response.json()) as { runs?: unknown };
    const runs = Array.isArray(data.runs) ? data.runs.map(parseAgentBridgeRun) : [];
    return { runs: runs.filter((run): run is AgentBridgeRun => run != null) };
  } catch {
    return null;
  }
}

export async function runAgentBridgeSession(baseUrl: string, sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/run`, {
      body: JSON.stringify({ sessionId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    return response.ok;
  } catch {
    return false;
  }
}
