/**
 * Рабочее место сессии разработки: рабочая копия репозитория на ветке задачи и то, что мост помнит
 * о сессии между прогонами — в каком репозитории решили делать и id разговора CLI для `--resume`.
 * Память лежит у моста (`BRIDGE_STATE_DIR`), а не в копии: агент её не закоммитит.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';

import { agentBridgeDevBranch } from '@/lib/agentSessions/agentBridgeDev';

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
export function prepareWorktree(repo: string, taskKey: string): string {
  const dir = join(dirname(repo), '.bt-agent', `${basename(repo)}-${taskKey}`);
  if (existsSync(dir)) {
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
    return dir;
  }
  let base = 'HEAD';
  try {
    base = git(repo, 'rev-parse', '--abbrev-ref', 'origin/HEAD');
  } catch {
    // origin без HEAD или без origin — от текущего HEAD.
  }
  git(repo, 'worktree', 'add', '-b', branch, dir, base);
  return dir;
}

/** Что мост помнит о сессии разработки: выбранный репозиторий и разговор CLI в нём. */
interface DevSessionMemory {
  cliSessionId?: string | null;
  repo?: string;
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

/**
 * Определение MCP-сервера Beer Tracker для прогона в рабочей копии. `claude mcp add` по умолчанию
 * пишет сервер только для папки, где его добавили, — в worktree его нет, и агент остаётся без тулов.
 * Берём определение там, где его видит CLI в папке моста: `~/.claude.json` (пользователь, затем проект
 * папки моста), затем `.mcp.json` папки моста. Вход по OAuth CLI подхватывает по тому же определению.
 * null — сервер не нашёлся.
 */
export function mcpConfigFor(server: string, bridgeDir: string): string | null {
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

