/**
 * Сессии разработки в локальном мосте: репозитории очереди задачи (Настройки → Агент; их несколько —
 * какой, решает агент коротким прогоном выбора), worktree с веткой `agent/<ключ>`, запуск `claude` с правом править код и коммитить, но без push.
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

function isAgentBridgeQueue(value: unknown): value is string {
  return typeof value === 'string' && QUEUE_RE.test(value);
}

/**
 * Репозиторий в настройках моста (`~/.beer-tracker/agent-bridge.json`) и очереди задач, которые в нём
 * делают: у одной очереди бывает несколько репозиториев (бэкенд, веб, мобилка), и наоборот.
 * `confirmed` — человек разрешил агенту работать в этой папке в терминале моста: браузер сам
 * такого разрешения не даёт, иначе любой скрипт на странице планера мог бы добавить свою папку.
 */
export interface AgentBridgeStoredRepo {
  confirmed: boolean;
  path: string;
  queues: string[];
}

/** ready — мост берёт задачи; pending — ждёт «y» в терминале моста; missing — папки нет или это не git. */
type AgentBridgeRepoStatus = 'missing' | 'pending' | 'ready';

export interface AgentBridgeRepoSettings {
  /** Git-репозитории, которые мост нашёл в домашней папке: подсказки для поля пути. */
  candidates: string[];
  repos: Array<{ path: string; queues: string[]; status: AgentBridgeRepoStatus }>;
}

/** Очереди из поля настроек или файла: ключи латиницей, без повторов. */
export function parseAgentBridgeQueues(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(/[\s,;]+/);
  return [...new Set(parts.map((part) => String(part).trim().toUpperCase()).filter(isAgentBridgeQueue))];
}

/** Файл настроек моста; битые строки пропускаем, на папку — одна запись. */
export function parseAgentBridgeRepoConfig(raw: unknown): AgentBridgeStoredRepo[] {
  const list = (raw as { repos?: unknown } | null)?.repos;
  if (!Array.isArray(list)) {
    return [];
  }
  const byPath = new Map<string, AgentBridgeStoredRepo>();
  for (const item of list as Array<Partial<AgentBridgeStoredRepo> | null>) {
    const queues = parseAgentBridgeQueues(item?.queues);
    if (item && typeof item.path === 'string' && item.path && queues.length > 0) {
      byPath.set(item.path, { confirmed: item.confirmed === true, path: item.path, queues });
    }
  }
  return [...byPath.values()];
}

/**
 * Список из настроек планера поверх сохранённого. Разрешение — на папку: правка очередей его
 * не сбрасывает, новая папка ждёт «y» в терминале.
 */
export function mergeAgentBridgeRepos(
  current: readonly AgentBridgeStoredRepo[],
  requested: ReadonlyArray<{ path: string; queues: string[] }>
): AgentBridgeStoredRepo[] {
  const byPath = new Map<string, AgentBridgeStoredRepo>();
  for (const { path, queues } of requested) {
    const confirmed = current.some((repo) => repo.path === path && repo.confirmed);
    byPath.set(path, { confirmed, path, queues: [...new Set([...(byPath.get(path)?.queues ?? []), ...queues])] });
  }
  return [...byPath.values()];
}

/** Как агент и человек зовут репозиторий: имя папки, при совпадении — с родительской. */
export function agentBridgeRepoNames(paths: readonly string[]): Map<string, string> {
  const segments = (path: string) => path.split('/').filter(Boolean);
  const short = (path: string) => segments(path).at(-1) ?? path;
  const names = new Map<string, string>();
  for (const path of paths) {
    const clash = paths.some((other) => other !== path && short(other) === short(path));
    names.set(path, clash ? segments(path).slice(-2).join('/') : short(path));
  }
  return names;
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
  /** `--mcp-config` с сервером Beer Tracker: в worktree его может не быть в настройках CLI. */
  mcpConfig: string | null;
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
    ...(input.mcpConfig ? ['--mcp-config', input.mcpConfig] : []),
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

const ROUTE_ANSWER_RE = /REPO:\s*(\S+)\s*$/;

/**
 * Прогон выбора репозитория, когда у очереди задачи их несколько: только чтение — бриф задачи,
 * переписка сессии и файлы кандидатов. Ответ — последней строкой `REPO: <имя>`; не понять по
 * задаче — агент спрашивает человека кнопками и отвечает `REPO: ?`.
 */
export function agentBridgeRouteClaudeArgs(input: {
  mcpServer: string;
  model: string;
  repos: ReadonlyArray<{ name: string; path: string }>;
  sessionId: string;
  taskKey: string;
}): string[] {
  const tool = (name: string) => `mcp__${input.mcpServer}__${name}`;
  const prompt = [
    `Задачу ${input.taskKey} из сессии разработки ${input.sessionId} в Beer Tracker нужно делать в одном из репозиториев:`,
    ...input.repos.map((repo) => `- ${repo.name}: ${repo.path}`),
    `Из тулов Beer Tracker используй только mcp__${input.mcpServer}__*. Прочитай get_task_brief(issueKey: "${input.taskKey}") и переписку get_agent_session — человек мог уже ответить, где делать.`,
    'Если нужно, загляни в репозитории (README, структура, поиск по коду) — только чтение, ничего не меняй.',
    'Последней строкой ответа напиши ровно `REPO: <имя из списка>`.',
    'Если по задаче понять нельзя — спроси человека через reply_agent_session(sessionId, message, options: имена репозиториев) и последней строкой напиши `REPO: ?`.',
  ].join('\n');
  return [
    '-p',
    prompt,
    '--model',
    input.model,
    '--tools',
    'Read,Glob,Grep,ToolSearch',
    ...input.repos.flatMap((repo) => ['--add-dir', repo.path]),
    '--output-format',
    'stream-json',
    '--verbose',
    '--allowedTools',
    ['Read', 'Glob', 'Grep', 'ToolSearch', ...['get_agent_session', 'get_task_brief', 'reply_agent_session'].map(tool)].join(','),
  ];
}

/** Имя репозитория из ответа прогона выбора; `?`, чужое имя или нет строки — null. */
export function parseAgentBridgeRouteAnswer(text: string, names: readonly string[]): string | null {
  const answer = text.trim().split('\n').at(-1)?.replaceAll('`', '').match(ROUTE_ANSWER_RE)?.[1];
  return answer && names.includes(answer) ? answer : null;
}

/** Итоговый текст прогона из события `result` потока CLI. */
export function agentBridgeResultText(line: string): string | null {
  try {
    const event = JSON.parse(line) as { result?: unknown; type?: unknown };
    return event.type === 'result' && typeof event.result === 'string' ? event.result : null;
  } catch {
    return null;
  }
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
