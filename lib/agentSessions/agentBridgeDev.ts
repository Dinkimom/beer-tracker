/**
 * Сессии разработки в локальном мосте: репозиторий очереди задачи (адрес мост узнаёт у человека в чате
 * и клонирует к себе; их несколько — какой, решает агент коротким прогоном выбора), worktree с веткой
 * `agent/<ключ>`, запуск `claude` с правом править код и коммитить, но без push.
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

/** `git@host:group/app.git` — короткая запись ssh. */
const SCP_REMOTE_RE = /^git@([\w.-]+):(\S+)$/;

/** Путь репозитория на сервере: сегменты из букв, цифр, `.`, `_`, `-`. */
const REMOTE_PATH_RE = /^[\w.-]+(?:\/[\w.-]+)*$/;

interface AgentBridgeRemote {
  /** Где лежит клон в кэше моста, относительно папки кэша: `host/group/app`. */
  dir: string;
  /** `group/app` — по нему агент и человек зовут репозиторий. */
  path: string;
  url: string;
}

function remoteHostAndPath(url: string): { host: string; path: string } | null {
  const scp = SCP_REMOTE_RE.exec(url);
  if (scp) {
    return { host: scp[1] ?? '', path: scp[2] ?? '' };
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ssh:' || parsed.protocol === 'https:'
      ? { host: parsed.hostname, path: decodeURIComponent(parsed.pathname).slice(1) }
      : null;
  } catch {
    return null;
  }
}

/**
 * Адрес репозитория для `git clone`: `git@host:group/app.git`, `ssh://…` или `https://…`. Из него —
 * папка клона в кэше моста (`host/group/app`), поэтому `..`, пробелы и кавычки не пускаем.
 */
export function parseAgentBridgeRemote(value: unknown): AgentBridgeRemote | null {
  const url = typeof value === 'string' ? value.trim() : '';
  const parts = remoteHostAndPath(url);
  let path = parts?.path ?? '';
  while (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  path = path.replace(/\.git$/, '');
  if (!parts?.host || !REMOTE_PATH_RE.test(path) || path.split('/').some((part) => part === '..' || part === '.')) {
    return null;
  }
  return { dir: `${parts.host}/${path}`, path, url };
}

/**
 * Адреса одного репозитория для клона: сначала ssh, затем https. Большой репозиторий по https сервер
 * обрывает через минуты (`early EOF`), а ssh без ключей отказывает сразу — так порядок дешевле.
 */
export function agentBridgeRemoteVariants(url: string): string[] {
  const remote = parseAgentBridgeRemote(url);
  if (!remote) {
    return [url];
  }
  const host = remote.dir.slice(0, remote.dir.length - remote.path.length - 1);
  const ssh = url.startsWith('https://') ? `git@${host}:${remote.path}.git` : url;
  const https = url.startsWith('https://') ? url : `https://${host}/${remote.path}.git`;
  return [ssh, https];
}

/**
 * Что мост запомнил: в каких репозиториях делают задачи очереди. У очереди бывает несколько
 * репозиториев (бэкенд, веб, мобилка); адрес мост узнаёт у человека в чате при первой задаче очереди.
 */
export type AgentBridgeKnownRepos = Record<string, string[]>;

/**
 * Клон репозитория, который уже есть на диске: из него мост копирует историю при первом клоне
 * (`git clone --reference … --dissociate`) — минуты вместо получаса у большого репозитория.
 * `found` — мост нашёл сам по `origin`, `chosen` — человек выбрал папку в настройках.
 */
interface AgentBridgeLocalCopy {
  path: string;
  source: 'chosen' | 'found';
}

/**
 * Что мост помнит, для Настроек → Агент: очереди и их репозитории; `cloned` — клон уже в кэше,
 * `local` — откуда взять историю для первого клона.
 */
export interface AgentBridgeRepoSettings {
  queues: Array<{
    queue: string;
    repos: Array<{ cloned: boolean; local: AgentBridgeLocalCopy | null; name: string; url: string }>;
  }>;
}

/** Выбранные человеком локальные копии из файла моста: папка клона в кэше → абсолютный путь. */
export function parseAgentBridgeLocalCopies(raw: unknown): Record<string, string> {
  const local = (raw as { local?: unknown } | null)?.local;
  if (!local || typeof local !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(local).filter(([dir, path]) => typeof path === 'string' && path.startsWith('/') && !dir.split('/').includes('..'))
  ) as Record<string, string>;
}

/**
 * Адрес `origin` из текста `.git/config`: секция `[remote "origin"]`, строка `url = …`. Без запуска
 * git — мост перебирает так сотню папок в поисках локальной копии.
 */
export function agentBridgeOriginFromGitConfig(text: string): string | null {
  let inOrigin = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      inOrigin = line === '[remote "origin"]';
    } else if (inOrigin && line.startsWith('url')) {
      const value = line.slice(line.indexOf('=') + 1).trim();
      return line.includes('=') && value ? value : null;
    }
  }
  return null;
}

/** Файл моста; битые очереди и адреса пропускаем. */
export function parseAgentBridgeKnownRepos(raw: unknown): AgentBridgeKnownRepos {
  const queues = (raw as { queues?: unknown } | null)?.queues;
  if (!queues || typeof queues !== 'object') {
    return {};
  }
  const known: AgentBridgeKnownRepos = {};
  for (const [queue, urls] of Object.entries(queues)) {
    const valid = Array.isArray(urls) ? urls.filter((url) => parseAgentBridgeRemote(url) != null) : [];
    if (isAgentBridgeQueue(queue) && valid.length > 0) {
      known[queue] = [...new Set(valid as string[])];
    }
  }
  return known;
}

/** Как агент и человек зовут репозиторий: последняя часть пути, при совпадении — с группой. */
export function agentBridgeRepoNames(urls: readonly string[]): Map<string, string> {
  const paths = new Map(urls.map((url) => [url, parseAgentBridgeRemote(url)?.path ?? url]));
  const short = (path: string) => path.split('/').at(-1) ?? path;
  const names = new Map<string, string>();
  for (const [url, path] of paths) {
    const clash = [...paths].some(([other, otherPath]) => other !== url && short(otherPath) === short(path));
    names.set(url, clash ? path.split('/').slice(-2).join('/') : short(path));
  }
  return names;
}

/** Git-команды, которые агенту разработки можно всегда: смотреть, добавлять и коммитить. */
const DEV_GIT_COMMANDS = ['git status', 'git diff', 'git log', 'git show', 'git add', 'git commit', 'git rev-parse'];

/**
 * Чем агент поднимает окружение и гоняет проверки в свежем клоне — инструменты самого проекта.
 * Какие команды нужны, он читает в правилах проекта (CLAUDE.md, AGENTS.md, README, Makefile).
 */
const DEV_PROJECT_COMMANDS = ['docker compose', 'docker-compose', 'make', 'npm', 'pnpm', 'yarn', 'composer'];

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

/**
 * Чтение из коннекторов claude.ai: в задачах ссылки на треды Slack, страницы Notion и Confluence,
 * связанные задачи Jira. Только чтение; нет коннектора — нет и тулов, правило ни на что не влияет.
 */
const DEV_READ_CONNECTOR_TOOLS = [
  'mcp__claude_ai_Slack__slack_read_thread',
  'mcp__claude_ai_Slack__slack_read_channel',
  'mcp__claude_ai_Slack__slack_read_canvas',
  'mcp__claude_ai_Slack__slack_read_file',
  'mcp__claude_ai_Slack__slack_search_public_and_private',
  'mcp__claude_ai_Notion__notion-search',
  'mcp__claude_ai_Notion__notion-fetch',
  'mcp__claude_ai_Atlassian_MCP__getJiraIssue',
  'mcp__claude_ai_Atlassian_MCP__getConfluenceContent',
  'mcp__claude_ai_Atlassian_MCP__searchConfluence',
];

/** Окружение и проверки — по правилам проекта: настраивать в мосте нечего. */
const PROJECT_SETUP_SENTENCE =
  'Окружение и проверки — по правилам проекта: прочитай CLAUDE.md, AGENTS.md, README, Makefile и docker-compose. Зависимости ставь и проверки (тесты, линтеры) запускай их командами — через docker compose, make или менеджер пакетов проекта — до коммита. Что запустить не удалось, назови в ответе и поставь tests: not_run.';

function agentBridgeDevPrompt(input: {
  mcpServer: string;
  resume: boolean;
  sessionId: string;
  taskKey: string;
}): string {
  const scope = `Из тулов Beer Tracker используй только mcp__${input.mcpServer}__*.`;
  if (input.resume) {
    return [
      `В сессии разработки ${input.sessionId} в Beer Tracker новые сообщения человека.`,
      scope,
      'Прочитай их через get_agent_session и продолжи работу в этой же ветке.',
      PROJECT_SETUP_SENTENCE,
      'Итог — reply_agent_session; если код менялся — с result.',
    ].join(' ');
  }
  return [
    `Ты в рабочей копии репозитория на ветке ${agentBridgeDevBranch(input.taskKey)}.`,
    `Обработай сессию разработки ${input.sessionId} в Beer Tracker — задачу ${input.taskKey}.`,
    scope,
    'Прочитай сессию через get_agent_session и следуй её hint: get_task_brief, transition_issue, код, проверки проекта, коммиты в этой ветке, reply_agent_session с result.',
    PROJECT_SETUP_SENTENCE,
    'Ссылки из задачи читай через WebFetch; Slack, Notion и Confluence — через их коннекторы, если они подключены.',
    'Не делай push и не открывай PR: ветку смотрит человек.',
    'Если задача неясна или заблокирована — спроси через reply_agent_session с options, не угадывай.',
  ].join(' ');
}

/**
 * Аргументы `claude` для сессии разработки: запускается в worktree задачи. Правки — режим
 * `acceptEdits` (только внутри рабочей папки), Bash — git из списка выше, инструменты проекта
 * (docker compose, make, менеджеры пакетов) и правила `.claude/settings.json` самого репозитория. `resumeId` — продолжить прошлый
 * разговор CLI по этой сессии, а не начинать заново.
 */
export function agentBridgeDevClaudeArgs(input: {
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
      ...[...DEV_GIT_COMMANDS, ...DEV_PROJECT_COMMANDS].map(bash),
      ...DEV_ALLOWED_TOOLS.map(tool),
      ...DEV_READ_CONNECTOR_TOOLS,
    ].join(','),
    '--disallowedTools',
    [...DEV_DENIED_BASH.map(bash), ...DEV_DENIED_TOOLS.map(tool)].join(','),
  ];
}

const ROUTE_ANSWER_RE = /REPO:\s*(\S+)\s*$/;

/**
 * Прогон выбора репозитория: у очереди задачи их несколько или мост ещё не знает ни одного. Только
 * чтение — бриф задачи и переписка сессии. Ответ — последней строкой `REPO: <имя>` из известных или
 * `REPO: <адрес для git clone>`, который человек прислал в чате; не понять — агент спрашивает
 * человека и отвечает `REPO: ?`.
 */
export function agentBridgeRouteClaudeArgs(input: {
  mcpServer: string;
  model: string;
  repos: ReadonlyArray<{ name: string; url: string }>;
  sessionId: string;
  taskKey: string;
}): string[] {
  const tool = (name: string) => `mcp__${input.mcpServer}__${name}`;
  const known =
    input.repos.length > 0
      ? [`Задачи очереди ${agentBridgeTaskQueue(input.taskKey)} делают в репозиториях:`, ...input.repos.map((repo) => `- ${repo.name}: ${repo.url}`)]
      : [`Где делают задачи очереди ${agentBridgeTaskQueue(input.taskKey)}, пока неизвестно.`];
  const prompt = [
    `Нужно понять, в каком репозитории делать задачу ${input.taskKey} из сессии разработки ${input.sessionId} в Beer Tracker.`,
    ...known,
    `Из тулов Beer Tracker используй только mcp__${input.mcpServer}__*. Прочитай get_task_brief(issueKey: "${input.taskKey}") и переписку get_agent_session — человек мог уже ответить, где делать.`,
    'Последней строкой ответа напиши ровно `REPO: <имя из списка>` или `REPO: <адрес>`, если человек прислал в переписке адрес репозитория для git clone (git@…, ssh://… или https://…).',
    'Если понять нельзя — спроси человека через reply_agent_session(sessionId, message): пусть выберет из списка (options — имена) или пришлёт адрес репозитория для git clone; последней строкой напиши `REPO: ?`.',
  ].join('\n');
  return [
    '-p',
    prompt,
    '--model',
    input.model,
    '--tools',
    'ToolSearch',
    '--output-format',
    'stream-json',
    '--verbose',
    '--allowedTools',
    ['ToolSearch', ...['get_agent_session', 'get_task_brief', 'reply_agent_session'].map(tool)].join(','),
  ];
}

/** Адрес репозитория из ответа прогона выбора: имя из известных или новый адрес; `?` и прочее — null. */
export function parseAgentBridgeRouteAnswer(text: string, known: ReadonlyMap<string, string>): string | null {
  const answer = text.trim().split('\n').at(-1)?.replaceAll('`', '').match(ROUTE_ANSWER_RE)?.[1];
  if (!answer) {
    return null;
  }
  const byName = [...known].find(([, name]) => name === answer)?.[0];
  if (byName) {
    return byName;
  }
  // Тот же репозиторий другим адресом (человек прислал https, а мост знает ssh) — берём известный.
  const remote = parseAgentBridgeRemote(answer);
  const same = [...known.keys()].find((url) => parseAgentBridgeRemote(url)?.dir === remote?.dir);
  return same ?? remote?.url ?? null;
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

/** Что сделано в ветке по сравнению с основной: живые данные git для ревью в планере. */
export interface AgentBridgeReview {
  commits: Array<{ sha: string; subject: string }>;
  files: Array<{ deletions: number; insertions: number; path: string }>;
  /** Ссылка на создание MR (GitLab) / PR (GitHub) из ветки; null — хостинг не распознан. */
  mergeRequestUrl: string | null;
  /** Ветка на origin и в ней всё, что есть локально. */
  pushed: boolean;
  /** Незакоммиченных файлов в рабочей копии. */
  uncommitted: number;
}

/** Веб-адрес репозитория по `origin`: `git@host:group/repo.git` и `https://…/repo.git` → `https://host/group/repo`. */
export function agentBridgeRemoteWebUrl(remote: string): string | null {
  const value = remote.trim();
  const scp = /^[\w.-]+@([\w.-]+):(.+?)(?:\.git)?\/?$/.exec(value);
  if (scp) {
    return `https://${scp[1]}/${scp[2]}`;
  }
  try {
    const url = new URL(value);
    if (!['https:', 'ssh:'].includes(url.protocol)) {
      return null;
    }
    return `https://${url.hostname}${url.pathname.replace(/\.git\/?$/, '').replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

/** Ссылка «создать MR/PR из ветки»: GitHub — compare, остальное — как у GitLab. */
export function agentBridgeMergeRequestUrl(webUrl: string, branch: string): string {
  if (new URL(webUrl).hostname === 'github.com') {
    return `${webUrl}/compare/${encodeURIComponent(branch)}?expand=1`;
  }
  return `${webUrl}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(branch)}`;
}

/** `git diff --numstat`: «+ − путь» на строку; у бинарных файлов вместо чисел «-». */
export function parseAgentBridgeNumstat(text: string): AgentBridgeReview['files'] {
  return text.split('\n').flatMap((line) => {
    const [insertions = '', deletions = '', ...path] = line.split('\t');
    return path.length > 0 ? [{ deletions: Number(deletions) || 0, insertions: Number(insertions) || 0, path: path.join('\t') }] : [];
  });
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
 * находит репозиторий (или спрашивает в чате). null — мост сессию не возьмёт: он не умеет разработку
 * (старая версия) или у сессии нет ключа задачи.
 */
export function agentBridgeRunTarget(
  session: { id: string; kind: 'dev' | 'plan'; taskId: string | null },
  dev: boolean
): AgentBridgeRunTarget | null {
  if (session.kind === 'plan') {
    return { sessionId: session.id };
  }
  const taskKey = session.taskId;
  return dev && taskKey && isAgentBridgeTaskKey(taskKey) ? { sessionId: session.id, taskKey } : null;
}
