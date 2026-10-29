/**
 * Репозитории для сессий разработки и очереди задач, которые в них делают. Список правят в планере
 * (Настройки → Агент), мост хранит его в `~/.beer-tracker/agent-bridge.json` (или `AGENT_BRIDGE_CONFIG`).
 * Новая папка начинает работать после «y» в терминале моста: из браузера разрешить агенту папку нельзя.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

import {
  type AgentBridgeRepoSettings,
  type AgentBridgeStoredRepo,
  mergeAgentBridgeRepos,
  parseAgentBridgeChecks,
  parseAgentBridgeCopyPaths,
  parseAgentBridgeQueues,
  parseAgentBridgeRepoConfig,
} from '@/lib/agentSessions/agentBridgeDev';

const CONFIG_PATH = process.env.AGENT_BRIDGE_CONFIG?.trim() || join(homedir(), '.beer-tracker', 'agent-bridge.json');

/** Папка состояния моста рядом с настройками: что он помнит о сессиях разработки. */
export const BRIDGE_STATE_DIR = join(dirname(CONFIG_PATH), 'agent-bridge-sessions');

/** Где искать репозитории для подсказок: домашняя папка и привычные папки с кодом, на один уровень. */
const CANDIDATE_ROOTS = ['', 'Desktop', 'Documents', 'Developer', 'Projects', 'projects', 'work', 'code', 'src', 'dev', 'repos', 'git'];

const CANDIDATE_LIMIT = 100;

function expandPath(path: string): string {
  return resolve(path.trim().replace(/^~(?=$|\/)/, homedir()));
}

function isGitRepo(path: string): boolean {
  return existsSync(join(path, '.git'));
}

function load(): AgentBridgeStoredRepo[] {
  try {
    return parseAgentBridgeRepoConfig(JSON.parse(readFileSync(CONFIG_PATH, 'utf8')));
  } catch {
    return [];
  }
}

let stored = load();

function save() {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify({ repos: stored }, null, 2)}\n`);
}

const isReady = (repo: AgentBridgeStoredRepo) => repo.confirmed && isGitRepo(repo.path);

/** Папки репозиториев, где делают задачи очереди: разрешённые в терминале и на месте. */
export function readyRepos(queue: string): string[] {
  return stored.filter((repo) => isReady(repo) && repo.queues.includes(queue)).map((repo) => repo.path);
}

/** Команды проверок репозитория — агенту можно их запускать. */
export function repoChecks(path: string): string[] {
  return stored.find((repo) => repo.path === path)?.checks ?? [];
}

/** Что ещё скопировать из основной папки в рабочую копию (кроме vendor/ и node_modules/). */
export function repoCopyPaths(path: string): string[] {
  return stored.find((repo) => repo.path === path)?.copy ?? [];
}

export function readyQueues(): string[] {
  return [...new Set(stored.filter(isReady).flatMap((repo) => repo.queues))];
}

function findCandidates(): string[] {
  const found = new Set<string>();
  for (const root of CANDIDATE_ROOTS.map((name) => join(homedir(), name))) {
    let children: string[] = [];
    try {
      children = readdirSync(root);
    } catch {
      continue;
    }
    for (const name of children) {
      const path = join(root, name);
      // Рабочие копии самого моста — тоже git, но не то, что нужно человеку.
      if (!name.startsWith('.') && isGitRepo(path)) {
        found.add(path);
      }
    }
  }
  return [...found].sort().slice(0, CANDIDATE_LIMIT);
}

export function repoSettings(): AgentBridgeRepoSettings {
  return {
    candidates: findCandidates(),
    repos: stored.map((repo) => {
      let status: AgentBridgeRepoSettings['repos'][number]['status'] = 'pending';
      if (!isGitRepo(repo.path)) {
        status = 'missing';
      } else if (repo.confirmed) {
        status = 'ready';
      }
      return { checks: repo.checks, copy: repo.copy, path: repo.path, queues: repo.queues, status };
    }),
  };
}

/** Вопросы «можно ли агенту в эту папку» — по одному, пока мост запущен в терминале. */
const asking = new Set<string>();
const askQueue: AgentBridgeStoredRepo[] = [];
let prompt: ReturnType<typeof createInterface> | null = null;

const keyOf = (repo: Pick<AgentBridgeStoredRepo, 'path'>) => repo.path;

function askNext() {
  const repo = askQueue[0];
  if (!repo || !prompt) {
    return;
  }
  prompt.question(`\nagent-bridge: разрешить агенту писать код и коммитить в ${repo.path} (задачи ${repo.queues.join(', ')})? [y/N] `, (answer) => {
    askQueue.shift();
    asking.delete(keyOf(repo));
    const current = stored.find((item) => keyOf(item) === keyOf(repo));
    if (current && answer.trim().toLowerCase() === 'y') {
      current.confirmed = true;
      process.stdout.write(`agent-bridge: ${repo.path} — разрешён\n`);
    } else if (current) {
      stored = stored.filter((item) => item !== current);
      process.stdout.write(`agent-bridge: ${repo.path} — не разрешён\n`);
    }
    save();
    askNext();
  });
}

function askForPending() {
  if (!process.stdin.isTTY) {
    if (stored.some((repo) => !repo.confirmed)) {
      process.stdout.write(`agent-bridge: новые репозитории ждут подтверждения — запусти мост в терминале или поставь "confirmed": true в ${CONFIG_PATH}\n`);
    }
    return;
  }
  prompt ??= createInterface({ input: process.stdin, output: process.stdout });
  const idle = askQueue.length === 0;
  for (const repo of stored.filter((item) => !item.confirmed && !asking.has(keyOf(item)))) {
    asking.add(keyOf(repo));
    askQueue.push(repo);
  }
  if (idle) {
    askNext();
  }
}

/** Строка из планера: путь — существующий git-репозиторий, хотя бы одна очередь. */
function parseRepoRow(
  item: { checks?: unknown; copy?: unknown; path?: unknown; queues?: unknown } | null
): { checks: string[]; copy: string[]; path: string; queues: string[] } | { error: string } {
  const path = typeof item?.path === 'string' && item.path.trim() ? expandPath(item.path) : '';
  if (!path || !isGitRepo(path)) {
    return { error: `not_a_git_repo: ${path || '—'}` };
  }
  const queues = parseAgentBridgeQueues(item?.queues);
  if (queues.length === 0) {
    return { error: `no_queues: ${path}` };
  }
  return { checks: parseAgentBridgeChecks(item?.checks), copy: parseAgentBridgeCopyPaths(item?.copy), path, queues };
}

/** PUT /repos из планера: проверить, сохранить и спросить про новые пары. Ошибка — текстом. */
export function updateRepos(raw: unknown): AgentBridgeRepoSettings | { error: string } {
  const list = (raw as { repos?: unknown } | null)?.repos;
  if (!Array.isArray(list)) {
    return { error: 'repos must be a list' };
  }
  const requested: Array<{ checks: string[]; copy: string[]; path: string; queues: string[] }> = [];
  for (const item of list as Array<{ checks?: unknown; copy?: unknown; path?: unknown; queues?: unknown } | null>) {
    const row = parseRepoRow(item);
    if ('error' in row) {
      return row;
    }
    requested.push(row);
  }
  stored = mergeAgentBridgeRepos(stored, requested);
  save();
  askForPending();
  return repoSettings();
}

/** На старте: вывести, что настроено, и спросить про то, что ещё не подтверждено. */
export function announceRepos() {
  for (const repo of stored) {
    const state = repo.confirmed ? '' : ' (ждёт подтверждения)';
    process.stdout.write(`  ${repo.path} — задачи ${repo.queues.join(', ')}${state}\n`);
  }
  askForPending();
}
