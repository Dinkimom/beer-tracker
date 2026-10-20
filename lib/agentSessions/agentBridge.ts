/**
 * Локальный мост к Claude CLI (`pnpm agent-bridge`): планер зовёт его, когда сессия ждёт агента,
 * мост запускает `claude -p` с MCP Beer Tracker. Здесь — общее для моста и планера, без Node и React.
 */

export const AGENT_BRIDGE_DEFAULT_PORT = 47821;

export const AGENT_BRIDGE_DEFAULT_URL = `http://127.0.0.1:${AGENT_BRIDGE_DEFAULT_PORT}`;

interface AgentBridgeHealth {
  /** Сессии, по которым сейчас работает CLI. */
  running: string[];
}

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAgentSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

/** Только чтение и предложение. `apply_*` агенту не даём: применяет человек на доске. */
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
  'list_agent_sessions',
  'get_agent_session',
  'propose_plan_patch',
  'reply_agent_session',
] as const;

const BRIDGE_DENIED_TOOLS = ['apply_plan_patch', 'apply_retro_board'] as const;

function agentBridgePrompt(sessionId: string, mcpServer: string): string {
  return [
    `Обработай сессию ${sessionId} в Beer Tracker.`,
    // Подключено может быть несколько стендов BT: сессия есть только на этом.
    `Используй только тулы mcp__${mcpServer}__*.`,
    'Прочитай её через get_agent_session и подтяни fetchContext.',
    `Если план нужно менять — propose_plan_patch с sessionId ${sessionId}, replacePending: true, ответами на комментарии в replies и draftMessage.`,
    'Если менять нечего — ответь через reply_agent_session.',
    'План не применяй: решение принимает человек на доске.',
  ].join(' ');
}

/** Аргументы `claude` для одной сессии; `mcpServer` — имя сервера Beer Tracker в конфиге CLI. */
export function agentBridgeClaudeArgs(sessionId: string, mcpServer: string): string[] {
  const tool = (name: string) => `mcp__${mcpServer}__${name}`;
  return [
    '-p',
    agentBridgePrompt(sessionId, mcpServer),
    '--allowedTools',
    BRIDGE_ALLOWED_TOOLS.map(tool).join(','),
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
    const data = (await response.json()) as Partial<AgentBridgeHealth>;
    return { running: Array.isArray(data.running) ? data.running.filter(isAgentSessionId) : [] };
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
