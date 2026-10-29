/**
 * Сессии разработки в локальном мосте: задача → репозиторий по очереди (Настройки → Агент),
 * worktree с веткой `agent/<ключ>`, запуск `claude` с правом править код и коммитить, но без push.
 * Здесь — общее для моста и планера, без Node и React; worktree и файлы — в `apps/agent-bridge`.
 */

/** Запуск в мосте: сессия, у сессии разработки — ещё ключ задачи (по нему репозиторий и ветка). */
export interface AgentBridgeRunTarget {
  sessionId: string;
  taskKey?: string;
}

const TASK_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/;

/** Ключ задачи трекера (RND-123): из него собираются путь worktree и ветка, другое не пускаем. */
export function isAgentBridgeTaskKey(value: unknown): value is string {
  return typeof value === 'string' && TASK_KEY_RE.test(value);
}

export function agentBridgeTaskQueue(taskKey: string): string {
  return taskKey.slice(0, taskKey.lastIndexOf('-'));
}

export function agentBridgeDevBranch(taskKey: string): string {
  return `agent/${taskKey}`;
}

const QUEUE_RE = /^[A-Z][A-Z0-9_]*$/;

export function isAgentBridgeQueue(value: unknown): value is string {
  return typeof value === 'string' && QUEUE_RE.test(value);
}

/**
 * Репозиторий для задач очереди в настройках моста (`~/.beer-tracker/agent-bridge.json`).
 * `confirmed` — человек разрешил агенту работать в этой папке в терминале моста: браузер сам
 * такого разрешения не даёт, иначе любой скрипт на странице планера мог бы добавить свою папку.
 */
export interface AgentBridgeStoredRepo {
  confirmed: boolean;
  path: string;
  queue: string;
}

/** ready — мост берёт задачи; pending — ждёт «y» в терминале моста; missing — папки нет или это не git. */
type AgentBridgeRepoStatus = 'missing' | 'pending' | 'ready';

export interface AgentBridgeRepoSettings {
  /** Git-репозитории, которые мост нашёл в домашней папке: подсказки для поля пути. */
  candidates: string[];
  repos: Array<{ path: string; queue: string; status: AgentBridgeRepoStatus }>;
}

/** Файл настроек моста; битые строки пропускаем, на очередь — одна запись. */
export function parseAgentBridgeRepoConfig(raw: unknown): AgentBridgeStoredRepo[] {
  const list = (raw as { repos?: unknown } | null)?.repos;
  if (!Array.isArray(list)) {
    return [];
  }
  const byQueue = new Map<string, AgentBridgeStoredRepo>();
  for (const item of list as Array<Partial<AgentBridgeStoredRepo> | null>) {
    if (item && isAgentBridgeQueue(item.queue) && typeof item.path === 'string' && item.path) {
      byQueue.set(item.queue, { confirmed: item.confirmed === true, path: item.path, queue: item.queue });
    }
  }
  return [...byQueue.values()];
}

/**
 * Список из настроек планера поверх сохранённого: подтверждение остаётся только у той же пары
 * очередь + путь — новая папка или новая очередь снова ждут «y» в терминале.
 */
export function mergeAgentBridgeRepos(
  current: readonly AgentBridgeStoredRepo[],
  requested: ReadonlyArray<{ path: string; queue: string }>
): AgentBridgeStoredRepo[] {
  const byQueue = new Map<string, AgentBridgeStoredRepo>();
  for (const { path, queue } of requested) {
    const same = current.find((repo) => repo.queue === queue && repo.path === path);
    byQueue.set(queue, { confirmed: same?.confirmed ?? false, path, queue });
  }
  return [...byQueue.values()];
}

/** Git-команды, которые агенту разработки можно всегда: смотреть, добавлять и коммитить. */
const DEV_GIT_COMMANDS = ['git status', 'git diff', 'git log', 'git show', 'git add', 'git commit', 'git rev-parse'];

/** Что агенту разработки нельзя никогда: выкладывать ветку, ходить в GitHub, менять план спринта. */
const DEV_DENIED_BASH = ['git push', 'gh', 'git reset --hard', 'git worktree', 'git checkout', 'git switch'];

const DEV_ALLOWED_TOOLS = [
  'whoami',
  'list_agent_sessions',
  'get_agent_session',
  'get_task_brief',
  'get_issue',
  'search_issues',
  'get_sprint_context',
  'transition_issue',
  'reply_agent_session',
] as const;

const DEV_DENIED_TOOLS = ['apply_plan_patch', 'propose_plan_patch', 'apply_retro_board'] as const;

function agentBridgeDevPrompt(input: { mcpServer: string; resume: boolean; sessionId: string; taskKey: string }): string {
  const scope = `Из тулов Beer Tracker используй только mcp__${input.mcpServer}__*.`;
  if (input.resume) {
    return [
      `В сессии разработки ${input.sessionId} в Beer Tracker новые сообщения человека.`,
      scope,
      'Прочитай их через get_agent_session и продолжи работу в этой же ветке.',
      'Итог — reply_agent_session; если код менялся — с result.',
    ].join(' ');
  }
  return [
    `Ты в рабочей копии репозитория на ветке ${agentBridgeDevBranch(input.taskKey)}.`,
    `Обработай сессию разработки ${input.sessionId} в Beer Tracker — задачу ${input.taskKey}.`,
    scope,
    'Прочитай сессию через get_agent_session и следуй её hint: get_task_brief, transition_issue, код, проверки проекта, коммиты в этой ветке, reply_agent_session с result.',
    'Ссылки из задачи читай через WebFetch.',
    'Не делай push и не открывай PR: ветку смотрит человек.',
    'Если задача неясна или заблокирована — спроси через reply_agent_session с options, не угадывай.',
  ].join(' ');
}

/**
 * Аргументы `claude` для сессии разработки: запускается в worktree задачи. Правки — режим
 * `acceptEdits` (только внутри рабочей папки), Bash — git из списка выше плюс `bash` из конфига
 * моста и правила `.claude/settings.json` самого репозитория. `resumeId` — продолжить прошлый
 * разговор CLI по этой сессии, а не начинать заново.
 */
export function agentBridgeDevClaudeArgs(input: {
  bash: readonly string[];
  mcpServer: string;
  model: string;
  resumeId: string | null;
  sessionId: string;
  taskKey: string;
}): string[] {
  const tool = (name: string) => `mcp__${input.mcpServer}__${name}`;
  const bash = (command: string) => `Bash(${command}:*)`;
  return [
    '-p',
    agentBridgeDevPrompt({ ...input, resume: input.resumeId != null }),
    ...(input.resumeId ? ['--resume', input.resumeId] : []),
    '--model',
    input.model,
    '--permission-mode',
    'acceptEdits',
    '--output-format',
    'stream-json',
    '--verbose',
    '--allowedTools',
    [
      'Read',
      'Glob',
      'Grep',
      'ToolSearch',
      'WebFetch',
      ...[...DEV_GIT_COMMANDS, ...input.bash].map(bash),
      ...DEV_ALLOWED_TOOLS.map(tool),
    ].join(','),
    '--disallowedTools',
    [...DEV_DENIED_BASH.map(bash), ...DEV_DENIED_TOOLS.map(tool)].join(','),
  ];
}

/** id разговора CLI из первого события потока (`system/init`): по нему потом `--resume`. */
export function agentBridgeCliSessionId(line: string): string | null {
  try {
    const event = JSON.parse(line) as { session_id?: unknown; subtype?: unknown; type?: unknown };
    return event.type === 'system' && event.subtype === 'init' && typeof event.session_id === 'string'
      ? event.session_id
      : null;
  } catch {
    return null;
  }
}

/**
 * Что отдать мосту на запуск: сессия, а у сессии разработки ещё и задача — по её очереди мост
 * выбирает репозиторий. null — мост эту сессию не возьмёт (задача из очереди без репозитория).
 */
export function agentBridgeRunTarget(
  session: { id: string; kind: 'dev' | 'plan'; taskId: string | null },
  devQueues: readonly string[]
): AgentBridgeRunTarget | null {
  if (session.kind === 'plan') {
    return { sessionId: session.id };
  }
  const taskKey = session.taskId;
  return taskKey && isAgentBridgeTaskKey(taskKey) && devQueues.includes(agentBridgeTaskQueue(taskKey))
    ? { sessionId: session.id, taskKey }
    : null;
}
