/**
 * Рабочее место сессии разработки: рабочая копия репозитория на ветке задачи и то, что мост помнит
 * о сессии между прогонами — в каком репозитории решили делать и id разговора CLI для `--resume`.
 * Память лежит у моста (`BRIDGE_STATE_DIR`), а не в копии: агент её не закоммитит.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';

import {
  agentBridgeDevBranch,
  agentBridgeMergeRequestUrl,
  agentBridgeRemoteWebUrl,
  type AgentBridgeReview,
  parseAgentBridgeNumstat,
} from '@/lib/agentSessions/agentBridgeDev';

import { BRIDGE_STATE_DIR } from './repoConfig';

/** git по полному пути из PATH, как и CLI: команда без пути — лишняя дыра для подмены. */
const gitBin =
  (process.env.PATH ?? '')
    .split(delimiter)
    .map((dir) => join(dir, 'git'))
    .find((bin) => bin.startsWith('/') && existsSync(bin)) ?? '/usr/bin/git';

function git(repo: string, ...args: string[]): string {
  return execFileSync(gitBin, ['-C', repo, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

/**
 * Рабочая копия задачи: `<папка репо>/../.bt-agent/<репо>-<ключ>` на ветке `agent/<ключ>`.
 * Есть — та же (просьба «переделай» продолжает ветку); ветка есть, а копии нет — копия на ней;
 * иначе новая ветка от основной ветки origin, без origin — от HEAD репозитория.
 */
function worktreeDir(repo: string, taskKey: string): string {
  return join(dirname(repo), '.bt-agent', `${basename(repo)}-${taskKey}`);
}

/**
 * Зависимости, которых нет в git, но без которых не запустить тесты и линтеры: в рабочую копию
 * их не кладёт `git worktree`. Копия, а не ссылка: автозагрузка (composer, node) раскрывает ссылку
 * и грузила бы код основной папки. На macOS — клон APFS (`cp -c`): мгновенно и без места на диске.
 */
const DEPENDENCY_DIRS = ['vendor', 'node_modules'];

const CLONE_FLAG = process.platform === 'darwin' ? '-c' : '--reflink=auto';

/** Скопировать путь из основной папки, если в рабочей копии его ещё нет. */
function copyIfMissing(from: string, to: string) {
  if (!existsSync(from) || existsSync(to)) {
    return;
  }
  mkdirSync(dirname(to), { recursive: true });
  execFileSync('/bin/cp', [CLONE_FLAG, '-R', from, to], { stdio: ['ignore', 'ignore', 'pipe'] });
}

/**
 * Дополнить папку рабочей копии недостающим из основной, ничего не перезаписывая (например `bin/`,
 * где часть файлов из git). `cp -n` завершается с ошибкой, когда что-то пропустил, — это и нужно.
 */
function mergeMissing(from: string, to: string) {
  if (!existsSync(from) || !existsSync(to) || !statSync(from).isDirectory()) {
    copyIfMissing(from, to);
    return;
  }
  try {
    execFileSync('/bin/cp', [CLONE_FLAG, '-R', '-n', `${from}/`, `${to}/`], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch {
    // Пропущенные существующие файлы — не ошибка.
  }
}

/** vendor/ и node_modules/ — целиком, если их нет; пути из настроек репозитория — дополнением. */
function copyDependencies(repo: string, dir: string, extra: readonly string[]) {
  for (const name of DEPENDENCY_DIRS) {
    copyIfMissing(join(repo, name), join(dir, name));
  }
  for (const name of extra) {
    mergeMissing(join(repo, name), join(dir, name));
  }
}

export function prepareWorktree(repo: string, taskKey: string, extra: readonly string[] = []): string {
  const dir = worktreeDir(repo, taskKey);
  if (existsSync(dir)) {
    copyDependencies(repo, dir, extra);
    return dir;
  }
  mkdirSync(dirname(dir), { recursive: true });
  const branch = agentBridgeDevBranch(taskKey);
  let hasBranch = true;
  try {
    git(repo, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
  } catch {
    hasBranch = false;
  }
  if (hasBranch) {
    git(repo, 'worktree', 'add', dir, branch);
    copyDependencies(repo, dir, extra);
    return dir;
  }
  let base = 'HEAD';
  try {
    base = git(repo, 'rev-parse', '--abbrev-ref', 'origin/HEAD');
  } catch {
    // origin без HEAD или без origin — от текущего HEAD.
  }
  git(repo, 'worktree', 'add', '-b', branch, dir, base);
  copyDependencies(repo, dir, extra);
  return dir;
}

/** Что мост помнит о сессии разработки: выбранный репозиторий и разговор CLI в нём. */
interface DevSessionMemory {
  cliSessionId?: string | null;
  repo?: string;
  taskKey?: string;
}

const memoryFile = (sessionId: string) => join(BRIDGE_STATE_DIR, `${sessionId}.json`);

export function readDevSession(sessionId: string): DevSessionMemory {
  try {
    return JSON.parse(readFileSync(memoryFile(sessionId), 'utf8')) as DevSessionMemory;
  } catch {
    return {};
  }
}

export function rememberDevSession(sessionId: string, patch: DevSessionMemory) {
  mkdirSync(BRIDGE_STATE_DIR, { recursive: true });
  writeFileSync(memoryFile(sessionId), JSON.stringify({ ...readDevSession(sessionId), ...patch }));
}

type McpServers = Record<string, unknown> | undefined;

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Коннектор claude.ai (`claude_ai_*`) привязан к аккаунту и доступен CLI в любой папке. */
export function isClaudeAiConnector(server: string): boolean {
  return server.startsWith('claude_ai_');
}

/**
 * Определение MCP-сервера Beer Tracker для прогона в рабочей копии. `claude mcp add` по умолчанию
 * пишет сервер только для папки, где его добавили, — в worktree его нет, и агент остаётся без тулов.
 * Берём определение там, где его видит CLI в папке моста: `~/.claude.json` (пользователь, затем проект
 * папки моста), затем `.mcp.json` папки моста. Вход по OAuth CLI подхватывает по тому же определению.
 * null — сервер не нашёлся.
 */
export function mcpConfigFor(server: string, bridgeDir: string): string | null {
  if (isClaudeAiConnector(server)) {
    return null;
  }
  const claude = readJson(join(homedir(), '.claude.json'));
  const projects = claude?.projects as Record<string, { mcpServers?: McpServers }> | undefined;
  const sources: McpServers[] = [
    claude?.mcpServers as McpServers,
    projects?.[bridgeDir]?.mcpServers,
    readJson(join(bridgeDir, '.mcp.json'))?.mcpServers as McpServers,
  ];
  const definition = sources.find((servers) => servers?.[server])?.[server];
  return definition ? JSON.stringify({ mcpServers: { [server]: definition } }) : null;
}

function gitOrNull(repo: string, ...args: string[]): string | null {
  try {
    return git(repo, ...args);
  } catch {
    return null;
  }
}

/** Основная ветка, от которой отросла задача: origin/HEAD, иначе origin/main или origin/master. */
function baseRef(worktree: string): string | null {
  const candidates = [gitOrNull(worktree, 'rev-parse', '--abbrev-ref', 'origin/HEAD'), 'origin/main', 'origin/master'];
  return candidates.find((ref) => ref && gitOrNull(worktree, 'rev-parse', '--verify', '--quiet', ref)) ?? null;
}

/** Что в ветке задачи: коммиты и файлы против основной ветки, запушено ли, ссылка на MR. */
/** Диапазон ветки задачи против основной: от точки ответвления до HEAD. */
function branchRange(worktree: string): string {
  const base = baseRef(worktree);
  return base ? `${base}...HEAD` : 'HEAD~1...HEAD';
}

function reviewOf(worktree: string, branch: string): AgentBridgeReview {
  const base = baseRef(worktree);
  const range = branchRange(worktree);
  const log = gitOrNull(worktree, 'log', '--format=%h%x09%s', base ? `${base}..HEAD` : '-1') ?? '';
  const upstreamBehind = gitOrNull(worktree, 'rev-list', '--count', '@{u}..HEAD');
  const webUrl = agentBridgeRemoteWebUrl(gitOrNull(worktree, 'remote', 'get-url', 'origin') ?? '');
  return {
    commits: log
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha = '', ...subject] = line.split('\t');
        return { sha, subject: subject.join('\t') };
      }),
    files: parseAgentBridgeNumstat(gitOrNull(worktree, 'diff', '--numstat', range) ?? ''),
    mergeRequestUrl: webUrl ? agentBridgeMergeRequestUrl(webUrl, branch) : null,
    pushed: upstreamBehind === '0',
    uncommitted: (gitOrNull(worktree, 'status', '--porcelain') ?? '').split('\n').filter(Boolean).length,
  };
}

/** Где лежит работа по сессии и что в ней — для ревью в планере. null — мост по ней ещё не работал. */
export function devWorkspace(sessionId: string): {
  branch: string;
  repo: string;
  review: AgentBridgeReview | null;
  worktree: string | null;
} | null {
  const { repo, taskKey } = readDevSession(sessionId);
  if (!repo || !taskKey) {
    return null;
  }
  const dir = worktreeDir(repo, taskKey);
  const branch = agentBridgeDevBranch(taskKey);
  const worktree = existsSync(dir) ? dir : null;
  return { branch, repo, review: worktree ? reviewOf(worktree, branch) : null, worktree };
}

/**
 * Push ветки задачи на origin — по клику человека в планере (агенту push запрещён). Без
 * интерактивных вопросов git: нет доступа — ошибка, а не зависший процесс.
 */
export function pushDevBranch(sessionId: string): { error: string } | { mergeRequestUrl: string | null } {
  const workspace = devWorkspace(sessionId);
  if (!workspace?.worktree) {
    return { error: 'no_worktree' };
  }
  try {
    execFileSync(gitBin, ['-C', workspace.worktree, 'push', '-u', 'origin', workspace.branch], {
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
    return { error: `push_failed: ${stderr?.split('\n').at(-1) ?? (error instanceof Error ? error.message : String(error))}` };
  }
  return { mergeRequestUrl: devWorkspace(sessionId)?.review?.mergeRequestUrl ?? null };
}

/** Предел диффа одного файла для карточки: больше — смотреть в редакторе. */
const DIFF_MAX = 200_000;

/** Дифф одного файла ветки против основной — только для файлов из списка изменений ветки. */
export function devFileDiff(sessionId: string, path: string): { diff: string; truncated: boolean } | { error: string } {
  const workspace = devWorkspace(sessionId);
  if (!workspace?.worktree || !workspace.review?.files.some((file) => file.path === path)) {
    return { error: 'unknown file' };
  }
  const diff = gitOrNull(workspace.worktree, 'diff', '--no-color', branchRange(workspace.worktree), '--', path) ?? '';
  return { diff: diff.slice(0, DIFF_MAX), truncated: diff.length > DIFF_MAX };
}

