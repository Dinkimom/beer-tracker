/**
 * В каких репозиториях делают задачи очереди: мост узнаёт адрес у человека в чате при первой задаче
 * очереди и запоминает в `~/.beer-tracker/agent-bridge.json` (или `AGENT_BRIDGE_CONFIG`). Клоны лежат
 * в кэше моста рядом с настройками (`repos/<хост>/<группа>/<репозиторий>`): папки на диске настраивать
 * не нужно. Если этот репозиторий у человека уже склонирован, первый клон берёт историю оттуда:
 * копию мост ищет сам по `origin` или человек выбирает папку в настройках (системный диалог — путь
 * из браузера мост не принимает). В Настройках → Агент видно, что запомнено, и можно забыть.
 */

import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  type AgentBridgeKnownRepos,
  type AgentBridgeRepoSettings,
  agentBridgeOriginFromGitConfig,
  agentBridgeRepoNames,
  parseAgentBridgeKnownRepos,
  parseAgentBridgeLocalCopies,
  parseAgentBridgeRemote,
} from '@/lib/agentSessions/agentBridgeDev';

const CONFIG_PATH = process.env.AGENT_BRIDGE_CONFIG?.trim() || join(homedir(), '.beer-tracker', 'agent-bridge.json');

/** git по полному пути из PATH, как и CLI: команда без пути — лишняя дыра для подмены. */
export const gitBin =
  (process.env.PATH ?? '')
    .split(delimiter)
    .map((dir) => join(dir, 'git'))
    .find((bin) => bin.startsWith('/') && existsSync(bin)) ?? '/usr/bin/git';

/** Папка состояния моста рядом с настройками: что он помнит о сессиях разработки. */
export const BRIDGE_STATE_DIR = join(dirname(CONFIG_PATH), 'agent-bridge-sessions');

/** Кэш клонов: репозитории, в которых агент работает. */
const REPOS_DIR = join(dirname(CONFIG_PATH), 'repos');

/** Папка клона репозитория в кэше моста; адрес не разобрался — null. */
export function cloneDir(url: string): string | null {
  const remote = parseAgentBridgeRemote(url);
  return remote ? join(REPOS_DIR, remote.dir) : null;
}

/**
 * Настройки до автоклона: `{repos: [{path, queues, confirmed}]}` с папками на диске. Переносим адреса
 * `origin` подтверждённых папок — очереди продолжают работать без вопроса в чате.
 */
function fromFolders(list: unknown[]): AgentBridgeKnownRepos {
  const queues: Record<string, string[]> = {};
  for (const item of list as Array<{ confirmed?: unknown; path?: unknown; queues?: unknown } | null>) {
    if (item?.confirmed !== true || typeof item.path !== 'string' || !Array.isArray(item.queues)) {
      continue;
    }
    let url = '';
    try {
      url = execFileSync(gitBin, ['-C', item.path, 'remote', 'get-url', 'origin'], { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      continue;
    }
    for (const queue of item.queues) {
      queues[String(queue)] = [...(queues[String(queue)] ?? []), url];
    }
  }
  return parseAgentBridgeKnownRepos({ queues });
}

function readConfig(): { local?: unknown; queues?: unknown; repos?: unknown } {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as { local?: unknown; queues?: unknown; repos?: unknown };
  } catch {
    return {};
  }
}

const initial = readConfig();
let known = Array.isArray(initial.repos) && !initial.queues ? fromFolders(initial.repos) : parseAgentBridgeKnownRepos(initial);
/** Локальные копии, выбранные человеком: папка клона в кэше (`host/group/app`) → путь на диске. */
let chosen = parseAgentBridgeLocalCopies(initial);

function save() {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify({ local: chosen, queues: known }, null, 2)}\n`);
}

/** Где искать уже склонированные репозитории: домашняя папка и привычные папки с кодом, на один уровень. */
const CANDIDATE_ROOTS = ['', 'Desktop', 'Documents', 'Developer', 'Projects', 'projects', 'work', 'code', 'src', 'dev', 'repos', 'git'];

/** Репозиторий в папке `path`: `host/group/app` по его `origin`; не git или без origin — null. */
function repoDirAt(path: string): string | null {
  try {
    const origin = agentBridgeOriginFromGitConfig(readFileSync(join(path, '.git', 'config'), 'utf8'));
    return parseAgentBridgeRemote(origin)?.dir ?? null;
  } catch {
    return null;
  }
}

/** Клон того же репозитория в привычных папках с кодом — первый найденный. */
function findLocalCopy(dir: string): string | null {
  for (const root of CANDIDATE_ROOTS.map((name) => join(homedir(), name))) {
    let entries: string[] = [];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    const match = entries.map((name) => join(root, name)).find((path) => !path.startsWith(REPOS_DIR) && repoDirAt(path) === dir);
    if (match) {
      return match;
    }
  }
  return null;
}

/** Откуда взять историю для первого клона: выбранная папка (если в ней всё ещё этот репозиторий), иначе найденная. */
export function localCopy(url: string): { path: string; source: 'chosen' | 'found' } | null {
  const dir = parseAgentBridgeRemote(url)?.dir;
  if (!dir) {
    return null;
  }
  const picked = chosen[dir];
  if (picked && repoDirAt(picked) === dir) {
    return { path: picked, source: 'chosen' };
  }
  const found = findLocalCopy(dir);
  return found ? { path: found, source: 'found' } : null;
}

const execFileAsync = promisify(execFile);

/**
 * Системный диалог выбора папки на машине моста: macOS — `choose folder`, Linux — zenity. Путь
 * приходит из диалога, а не из браузера. Отмена — null; диалога нет — исключение.
 */
async function pickFolder(prompt: string): Promise<string | null> {
  const [command, args] =
    process.platform === 'darwin'
      ? ['/usr/bin/osascript', ['-e', `POSIX path of (choose folder with prompt "${prompt}" default location (path to home folder))`]]
      : ['zenity', ['--file-selection', '--directory', `--title=${prompt}`]];
  try {
    const { stdout } = await execFileAsync(command, args as string[], { timeout: 600_000 });
    const path = stdout.trim();
    return path ? resolve(path) : null;
  } catch (error) {
    if ((error as { code?: unknown }).code === 'ENOENT') {
      throw new Error('picker_unavailable');
    }
    return null;
  }
}

/**
 * «Выбрать папку» в настройках: диалог, затем проверка — в папке git-клон этого же репозитория.
 * Ошибка — `{ error: 'код: подробность' }`; отмена диалога — настройки как были.
 */
export async function chooseLocalCopy(url: string): Promise<AgentBridgeRepoSettings | { error: string }> {
  const remote = parseAgentBridgeRemote(url);
  if (!remote) {
    return { error: 'bad_remote' };
  }
  let path: string | null;
  try {
    path = await pickFolder(`Папка с клоном ${remote.path}`);
  } catch {
    return { error: 'picker_unavailable' };
  }
  if (!path) {
    return repoSettings();
  }
  const dir = repoDirAt(path);
  if (!dir) {
    return { error: `not_a_git_repo: ${path}` };
  }
  if (dir !== remote.dir) {
    return { error: `other_repo: ${dir}` };
  }
  chosen = { ...chosen, [remote.dir]: path };
  save();
  return repoSettings();
}

/** «Не использовать» выбранную папку: дальше мост снова ищет копию сам. */
export function forgetLocalCopy(url: string): AgentBridgeRepoSettings {
  const dir = parseAgentBridgeRemote(url)?.dir;
  chosen = Object.fromEntries(Object.entries(chosen).filter(([key]) => key !== dir));
  save();
  return repoSettings();
}

/** Адреса репозиториев очереди. */
export function knownRepos(queue: string): string[] {
  return known[queue] ?? [];
}

export function rememberRepo(queue: string, url: string) {
  if (!knownRepos(queue).includes(url)) {
    known = { ...known, [queue]: [...knownRepos(queue), url] };
    save();
  }
}

/** Забыть репозиторий очереди (Настройки → Агент). Клон в кэше остаётся: его могут брать другие очереди. */
export function forgetRepo(queue: string, url: string): AgentBridgeRepoSettings {
  const rest = knownRepos(queue).filter((item) => item !== url);
  known = Object.fromEntries(Object.entries({ ...known, [queue]: rest }).filter(([, urls]) => urls.length > 0));
  save();
  return repoSettings();
}

export function repoSettings(): AgentBridgeRepoSettings {
  return {
    queues: Object.entries(known)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([queue, urls]) => {
        const names = agentBridgeRepoNames(urls);
        return {
          queue,
          repos: urls.map((url) => {
            const cloned = existsSync(join(cloneDir(url) ?? '', '.git'));
            // Локальная копия нужна только первому клону — у склонированного её не ищем.
            return { cloned, local: cloned ? null : localCopy(url), name: names.get(url) ?? url, url };
          }),
        };
      }),
  };
}

/** На старте: вывести, что запомнено. */
export function announceRepos() {
  for (const { queue, repos } of repoSettings().queues) {
    process.stdout.write(`  ${queue} → ${repos.map((repo) => repo.url).join(', ')}\n`);
  }
  save();
}
