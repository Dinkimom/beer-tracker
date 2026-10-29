/**
 * Репозитории для сессий разработки: какая очередь задач в какой папке. Список правят в планере
 * (Настройки → Агент), мост хранит его в `~/.beer-tracker/agent-bridge.json` (или `AGENT_BRIDGE_CONFIG`).
 * Новая пара начинает работать после «y» в терминале моста: из браузера разрешить агенту папку нельзя.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

import {
  type AgentBridgeRepoSettings,
  type AgentBridgeStoredRepo,
  isAgentBridgeQueue,
  mergeAgentBridgeRepos,
  parseAgentBridgeRepoConfig,
} from '@/lib/agentSessions/agentBridgeDev';

const CONFIG_PATH = process.env.AGENT_BRIDGE_CONFIG?.trim() || join(homedir(), '.beer-tracker', 'agent-bridge.json');

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

/** Папка репозитория для задач очереди, если пара подтверждена и папка на месте. */
export function readyRepo(queue: string): string | undefined {
  const repo = stored.find((item) => item.queue === queue && item.confirmed);
  return repo && isGitRepo(repo.path) ? repo.path : undefined;
}

export function readyQueues(): string[] {
  return stored.filter((repo) => readyRepo(repo.queue)).map((repo) => repo.queue);
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
      return { path: repo.path, queue: repo.queue, status };
    }),
  };
}

/** Вопросы «можно ли агенту в эту папку» — по одному, пока мост запущен в терминале. */
const asking = new Set<string>();
const askQueue: AgentBridgeStoredRepo[] = [];
let prompt: ReturnType<typeof createInterface> | null = null;

const keyOf = (repo: Pick<AgentBridgeStoredRepo, 'path' | 'queue'>) => `${repo.queue}=${repo.path}`;

function askNext() {
  const repo = askQueue[0];
  if (!repo || !prompt) {
    return;
  }
  prompt.question(`\nagent-bridge: разрешить агенту писать код и коммитить в ${repo.path} для задач ${repo.queue}? [y/N] `, (answer) => {
    askQueue.shift();
    asking.delete(keyOf(repo));
    const current = stored.find((item) => keyOf(item) === keyOf(repo));
    if (current && answer.trim().toLowerCase() === 'y') {
      current.confirmed = true;
      process.stdout.write(`agent-bridge: задачи ${repo.queue} → ${repo.path}\n`);
    } else if (current) {
      stored = stored.filter((item) => item !== current);
      process.stdout.write(`agent-bridge: ${repo.queue} → ${repo.path} не разрешён\n`);
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

/** Строка из планера: очередь в верхнем регистре, путь — существующий git-репозиторий. */
function parseRepoRow(item: { path?: unknown; queue?: unknown } | null): { error: string } | { path: string; queue: string } {
  const queue = typeof item?.queue === 'string' ? item.queue.trim().toUpperCase() : '';
  if (!isAgentBridgeQueue(queue)) {
    return { error: `invalid_queue: ${queue || '—'}` };
  }
  const path = typeof item?.path === 'string' && item.path.trim() ? expandPath(item.path) : '';
  return path && isGitRepo(path) ? { path, queue } : { error: `not_a_git_repo: ${path || '—'}` };
}

/** PUT /repos из планера: проверить, сохранить и спросить про новые пары. Ошибка — текстом. */
export function updateRepos(raw: unknown): AgentBridgeRepoSettings | { error: string } {
  const list = (raw as { repos?: unknown } | null)?.repos;
  if (!Array.isArray(list)) {
    return { error: 'repos must be a list' };
  }
  const requested: Array<{ path: string; queue: string }> = [];
  for (const item of list as Array<{ path?: unknown; queue?: unknown } | null>) {
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
    process.stdout.write(`  задачи ${repo.queue} → ${repo.path}${state}\n`);
  }
  askForPending();
}
