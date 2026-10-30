/**
 * В каких репозиториях делают задачи очереди: мост узнаёт адрес у человека в чате при первой задаче
 * очереди и запоминает в `~/.beer-tracker/agent-bridge.json` (или `AGENT_BRIDGE_CONFIG`). Клоны лежат
 * в кэше моста рядом с настройками (`repos/<хост>/<группа>/<репозиторий>`): папки на диске настраивать
 * не нужно. В Настройках → Агент видно, что запомнено, и можно забыть.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';

import {
  type AgentBridgeKnownRepos,
  type AgentBridgeRepoSettings,
  agentBridgeRepoNames,
  parseAgentBridgeKnownRepos,
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

function load(): AgentBridgeKnownRepos {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as { queues?: unknown; repos?: unknown };
    return Array.isArray(raw.repos) && !raw.queues ? fromFolders(raw.repos) : parseAgentBridgeKnownRepos(raw);
  } catch {
    return {};
  }
}

let known = load();

function save() {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify({ queues: known }, null, 2)}\n`);
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
          repos: urls.map((url) => ({
            cloned: existsSync(join(cloneDir(url) ?? '', '.git')),
            name: names.get(url) ?? url,
            url,
          })),
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
