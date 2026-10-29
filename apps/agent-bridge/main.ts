/**
 * Локальный мост планер → Claude CLI. Планер шлёт POST /run {sessionId}, когда сессия ждёт агента;
 * мост запускает `claude -p` с MCP Beer Tracker (только чтение и propose, без apply).
 * В простое ничего не делает: не опрашивает BT и не тратит токены.
 *
 * Env:
 *   AGENT_BRIDGE_TARGETS     — «адрес планера=MCP-сервер» через запятую, имя сервера — как в именах тулов
 *                              (`mcp__<сервер>__…`); обязателен
 *   AGENT_BRIDGE_PORT        — порт на 127.0.0.1 (default 47821)
 *   AGENT_BRIDGE_CLAUDE_BIN  — путь к CLI (default: claude из PATH, иначе из расширения VS Code / Cursor)
 *   AGENT_BRIDGE_TIMEOUT_MIN — лимит одного запуска (default 10)
 *   AGENT_BRIDGE_MODEL       — модель CLI (default sonnet; opus — дороже раза в два)
 *   AGENT_BRIDGE_CONFIG      — файл настроек моста (default ~/.beer-tracker/agent-bridge.json): репозитории
 *                              для сессий разработки; правят их в планере, Настройки → Агент (`repoConfig.ts`)
 *   AGENT_BRIDGE_DEV_BASH    — команды, которые агенту разработки можно запускать (через запятую,
 *                              префиксом: `pnpm test,pnpm lint`); плюс правила `.claude/settings.json` репо
 *   AGENT_BRIDGE_DEV_TIMEOUT_MIN — лимит одного прогона сессии разработки (default 60)
 *
 * `pnpm agent-bridge` читает их из `.env.agent-bridge.local` (пример — `.env.agent-bridge.example`).
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

import {
  AGENT_BRIDGE_DEFAULT_MODEL,
  AGENT_BRIDGE_DEFAULT_PORT,
  agentBridgeClaudeArgs,
  agentBridgeStepFromStreamLine,
  type AgentBridgeStep,
  agentBridgeTallyUsage,
  agentBridgeUsageTotal,
  type AgentBridgeUsageTally,
  EMPTY_AGENT_BRIDGE_USAGE_TALLY,
  isAgentBridgeHostAllowed,
  isAgentSessionId,
  parseAgentBridgeTargets,
  tallyAgentBridgeUsage,
} from '@/lib/agentSessions/agentBridge';
import {
  agentBridgeCliSessionId,
  agentBridgeDevBranch,
  agentBridgeDevClaudeArgs,
  agentBridgeTaskQueue,
  isAgentBridgeTaskKey,
} from '@/lib/agentSessions/agentBridgeDev';

import { announceRepos, readyQueues, readyRepo, repoSettings, updateRepos } from './repoConfig';

const port = Number(process.env.AGENT_BRIDGE_PORT) || AGENT_BRIDGE_DEFAULT_PORT;
const targets = parseAgentBridgeTargets(process.env.AGENT_BRIDGE_TARGETS ?? '');
if (targets.size === 0) {
  process.stderr.write('agent-bridge: задай AGENT_BRIDGE_TARGETS в .env.agent-bridge.local (пример — .env.agent-bridge.example)\n');
  process.exit(1);
}

/** CLI из PATH, иначе свежий из расширения Claude Code в VS Code / Cursor (путь меняется с версией). */
function resolveClaudeBin(): string {
  const fromEnv = process.env.AGENT_BRIDGE_CLAUDE_BIN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const inPath = (process.env.PATH ?? '').split(delimiter).find((dir) => dir && existsSync(join(dir, 'claude')));
  if (inPath) {
    return 'claude';
  }
  for (const editor of ['.vscode', '.cursor']) {
    const root = join(homedir(), editor, 'extensions');
    const bundled = (existsSync(root) ? readdirSync(root) : [])
      .filter((name) => name.startsWith('anthropic.claude-code-'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((name) => join(root, name, 'resources', 'native-binary', 'claude'))
      .find((bin) => existsSync(bin));
    if (bundled) {
      return bundled;
    }
  }
  return 'claude';
}

const claudeBin = resolveClaudeBin();
const timeoutMs = (Number(process.env.AGENT_BRIDGE_TIMEOUT_MIN) || 10) * 60_000;
const devTimeoutMs = (Number(process.env.AGENT_BRIDGE_DEV_TIMEOUT_MIN) || 60) * 60_000;
const model = process.env.AGENT_BRIDGE_MODEL?.trim() || AGENT_BRIDGE_DEFAULT_MODEL;
const devBash = (process.env.AGENT_BRIDGE_DEV_BASH ?? '')
  .split(',')
  .map((command) => command.trim())
  .filter(Boolean);
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
function prepareWorktree(repo: string, taskKey: string): string {
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

/** id разговора CLI по сессии лежит рядом с копией, а не в ней: агент не закоммитит его. */
function cliSessionFile(worktree: string): string {
  return `${worktree}.claude-session`;
}

function readCliSessionId(worktree: string): string | null {
  try {
    return readFileSync(cliSessionFile(worktree), 'utf8').trim() || null;
  } catch {
    return null;
  }
}

/** Как запустить CLI: обычная сессия — в папке моста; сессия разработки — в worktree задачи. */
function launchSpec(sessionId: string, mcpServer: string, taskKey: string | undefined) {
  const repo = taskKey ? readyRepo(agentBridgeTaskQueue(taskKey)) : undefined;
  if (!taskKey || !repo) {
    return { args: agentBridgeClaudeArgs(sessionId, mcpServer, model), cwd: undefined, limitMs: timeoutMs };
  }
  const cwd = prepareWorktree(repo, taskKey);
  const resumeId = readCliSessionId(cwd);
  const args = agentBridgeDevClaudeArgs({ bash: devBash, mcpServer, model, resumeId, sessionId, taskKey });
  return { args, cwd, limitMs: devTimeoutMs };
}

interface RunState {
  /** Нужен ещё один прогон после текущего: человек дописал, пока агент работал. */
  again: boolean;
  startedAt: number;
  step: AgentBridgeStep;
  usage: AgentBridgeUsageTally;
}

const running = new Map<string, RunState>();

function log(sessionId: string, message: string) {
  process.stdout.write(`[${new Date().toLocaleTimeString()}] ${sessionId.slice(0, 8)} ${message}\n`);
}

/** Сессия живёт на том стенде, откуда пришла просьба, — и MCP берём его. */
function runSession(sessionId: string, mcpServer: string, taskKey?: string) {
  const state: RunState = {
    again: false,
    startedAt: Date.now(),
    step: 'starting',
    usage: EMPTY_AGENT_BRIDGE_USAGE_TALLY,
  };
  running.set(sessionId, state);
  let spec: ReturnType<typeof launchSpec>;
  try {
    spec = launchSpec(sessionId, mcpServer, taskKey);
  } catch (error) {
    running.delete(sessionId);
    log(sessionId, `не подготовил рабочую копию ${taskKey}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  log(sessionId, spec.cwd ? `claude запущен в ${spec.cwd} (${mcpServer})` : `claude запущен (${mcpServer})`);
  const child = spawn(claudeBin, spec.args, { cwd: spec.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  const timer = setTimeout(() => {
    log(sessionId, 'таймаут, останавливаю');
    child.kill('SIGTERM');
  }, spec.limitMs);
  // stream-json: по строке на событие. Шаг — для планера, в консоль — смена шага и токены в конце.
  createInterface({ input: child.stdout }).on('line', (line) => {
    const cliSessionId = spec.cwd ? agentBridgeCliSessionId(line) : null;
    if (cliSessionId && spec.cwd) {
      writeFileSync(cliSessionFile(spec.cwd), cliSessionId);
    }
    state.usage = tallyAgentBridgeUsage(state.usage, line);
    const step = agentBridgeStepFromStreamLine(line);
    if (step && step !== state.step) {
      state.step = step;
      log(sessionId, step);
    }
  });
  child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));
  let finished = false;
  const finish = (detail: string) => {
    if (finished) {
      return;
    }
    finished = true;
    clearTimeout(timer);
    const seconds = Math.round((Date.now() - state.startedAt) / 1000);
    const usage = agentBridgeTallyUsage(state.usage);
    const cost = usage.costUsd == null ? '' : `, $${usage.costUsd.toFixed(3)}`;
    log(sessionId, `${detail} за ${seconds} с, ${agentBridgeUsageTotal(usage)} токенов${cost}`);
    running.delete(sessionId);
    if (state.again) {
      runSession(sessionId, mcpServer, taskKey);
    }
  };
  child.on('error', (error) => finish(`не запустился: ${error.message}`));
  child.on('close', (code) => finish(`готово, код ${code ?? '—'}`));
}

function requestRun(sessionId: string, mcpServer: string, taskKey?: string) {
  const current = running.get(sessionId);
  if (current) {
    current.again = true;
    return;
  }
  runSession(sessionId, mcpServer, taskKey);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 16_384) {
        reject(new Error('body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function send(response: ServerResponse, status: number, origin: string, body?: unknown) {
  response.writeHead(status, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    // Chrome: запрос с публичной страницы на 127.0.0.1 (Private Network Access).
    'Access-Control-Allow-Private-Network': 'true',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

/** Тело POST /run: сессия, у сессии разработки — задача из очереди, для которой задан репозиторий. */
function parseRunRequest(body: string): { error: string } | { sessionId: string; taskKey?: string } {
  const { sessionId, taskKey } = JSON.parse(body) as { sessionId?: unknown; taskKey?: unknown };
  if (!isAgentSessionId(sessionId)) {
    return { error: 'invalid sessionId' };
  }
  if (taskKey === undefined) {
    return { sessionId };
  }
  return isAgentBridgeTaskKey(taskKey) && readyRepo(agentBridgeTaskQueue(taskKey))
    ? { sessionId, taskKey }
    : { error: 'unknown task queue' };
}

type Route = (request: IncomingMessage, response: ServerResponse, origin: string, mcpServer: string) => Promise<void> | void;

const routes: Readonly<Record<string, Route>> = {
  'GET /health': (_request, response, origin) => {
    const runs = [...running].map(([sessionId, { startedAt, step }]) => ({ sessionId, startedAt, step }));
    send(response, 200, origin, { devQueues: readyQueues(), runs });
  },
  'POST /run': async (request, response, origin, mcpServer) => {
    const run = parseRunRequest(await readBody(request));
    if ('error' in run) {
      send(response, 400, origin, run);
      return;
    }
    requestRun(run.sessionId, mcpServer, run.taskKey);
    send(response, 202, origin, { ok: true });
  },
  // Настройки → Агент в планере: репозитории для сессий разработки.
  'GET /repos': (_request, response, origin) => send(response, 200, origin, repoSettings()),
  'PUT /repos': async (request, response, origin) => {
    const result = updateRepos(JSON.parse(await readBody(request)));
    send(response, 'error' in result ? 400 : 200, origin, result);
  },
};

async function handle(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin ?? '';
  const mcpServer = targets.get(origin);
  if (!isAgentBridgeHostAllowed(request.headers.host, port) || !mcpServer) {
    response.writeHead(403).end();
    return;
  }
  if (request.method === 'OPTIONS') {
    send(response, 204, origin);
    return;
  }
  const route = routes[`${request.method} ${request.url}`];
  if (route) {
    await route(request, response, origin, mcpServer);
    return;
  }
  send(response, 404, origin);
}

const server = createServer((request, response) => {
  handle(request, response).catch(() => {
    if (!response.headersSent) {
      response.writeHead(400).end();
    }
  });
});
server.on('error', (error: NodeJS.ErrnoException) => {
  const reason = error.code === 'EADDRINUSE' ? `порт ${port} занят — мост уже запущен?` : error.message;
  process.stderr.write(`agent-bridge: ${reason}\n`);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(
    [
      `agent-bridge: http://127.0.0.1:${port}`,
      ...[...targets].map(([origin, mcpServer]) => `  ${origin} → MCP ${mcpServer}`),
      `  CLI: ${claudeBin}, модель ${model}`,
      '',
    ].join('\n')
  );
  announceRepos();
});
