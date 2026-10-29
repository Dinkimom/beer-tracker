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
 *   AGENT_BRIDGE_DEV_TIMEOUT_MIN — лимит одного прогона сессии разработки (default 60)
 *
 * `pnpm agent-bridge` читает их из `.env.agent-bridge.local` (пример — `.env.agent-bridge.example`).
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { createInterface } from 'node:readline';

import {
  AGENT_BRIDGE_DEFAULT_MODEL,
  AGENT_BRIDGE_FINISHED_TEXT_MAX,
  type AgentBridgeFinishedRun,
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
  agentBridgeDevClaudeArgs,
  agentBridgeExpandChecks,
  agentBridgeRepoNames,
  agentBridgeResultText,
  agentBridgeRouteClaudeArgs,
  agentBridgeTaskQueue,
  isAgentBridgeTaskKey,
  parseAgentBridgeRouteAnswer,
} from '@/lib/agentSessions/agentBridgeDev';

import {
  devFileDiff,
  devWorkspace,
  isClaudeAiConnector,
  mcpConfigFor,
  prepareWorktree,
  pushDevBranch,
  readDevSession,
  rememberDevSession,
} from './devWorkspace';
import { announceRepos, readyQueues, readyRepos, repoChecks, repoCopyPaths, repoSettings, updateRepos } from './repoConfig';

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
interface RunState {
  /** Нужен ещё один прогон после текущего: человек дописал, пока агент работал. */
  again: boolean;
  /** Почему прогон не удался (CLI не запустился, таймаут, код ≠ 0, нет рабочей копии). */
  error?: string;
  startedAt: number;
  step: AgentBridgeStep;
  /** Последний итоговый текст агента: если в чат он не ответил, человек увидит хотя бы его. */
  text: string;
}

const running = new Map<string, RunState>();

/** Чем кончился последний прогон по сессии — планер покажет, если агент так и не ответил в чат. */
const finished = new Map<string, AgentBridgeFinishedRun>();

/** Итоги старше этого планеру не нужны: сессию уже либо подхватили, либо забыли. */
const FINISHED_KEEP_MS = 6 * 60 * 60_000;

function recordFinished(sessionId: string, state: RunState) {
  const now = Date.now();
  for (const [id, run] of finished) {
    if (now - run.at > FINISHED_KEEP_MS) {
      finished.delete(id);
    }
  }
  finished.set(sessionId, {
    at: now,
    ...(state.error ? { error: state.error } : {}),
    sessionId,
    text: state.text.slice(-AGENT_BRIDGE_FINISHED_TEXT_MAX),
  });
}

function log(sessionId: string, message: string) {
  process.stdout.write(`[${new Date().toLocaleTimeString()}] ${sessionId.slice(0, 8)} ${message}\n`);
}

interface CliRun {
  args: string[];
  cwd?: string;
  label: string;
  limitMs: number;
  /** id разговора CLI из первого события — запомнить для `--resume`. */
  onCliSession?: (cliSessionId: string) => void;
}

/**
 * Один прогон CLI. stream-json: по строке на событие — шаг для планера, в консоль смена шага
 * и токены в конце. Результат — итоговый текст агента (для прогона выбора репозитория).
 */
function runCli(sessionId: string, state: RunState, run: CliRun): Promise<string> {
  return new Promise((resolveRun) => {
    log(sessionId, run.cwd ? `${run.label} в ${run.cwd}` : run.label);
    const startedAt = Date.now();
    let usage: AgentBridgeUsageTally = EMPTY_AGENT_BRIDGE_USAGE_TALLY;
    let result = '';
    const child = spawn(claudeBin, run.args, { cwd: run.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      log(sessionId, 'таймаут, останавливаю');
      state.error = `timeout: ${Math.round(run.limitMs / 60_000)} min`;
      child.kill('SIGTERM');
    }, run.limitMs);
    createInterface({ input: child.stdout }).on('line', (line) => {
      const cliSessionId = run.onCliSession ? agentBridgeCliSessionId(line) : null;
      if (cliSessionId) {
        run.onCliSession?.(cliSessionId);
      }
      result = agentBridgeResultText(line) ?? result;
      usage = tallyAgentBridgeUsage(usage, line);
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
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const total = agentBridgeTallyUsage(usage);
      const cost = total.costUsd == null ? '' : `, $${total.costUsd.toFixed(3)}`;
      log(sessionId, `${detail} за ${seconds} с, ${agentBridgeUsageTotal(total)} токенов${cost}`);
      state.text = result || state.text;
      resolveRun(result);
    };
    child.on('error', (error) => {
      state.error = `cli_not_started: ${error.message}`;
      finish(`не запустился: ${error.message}`);
    });
    child.on('close', (code) => {
      if (code !== 0 && !state.error) {
        state.error = `cli_exit: ${code ?? 'signal'}`;
      }
      finish(`готово, код ${code ?? '—'}`);
    });
  });
}

/**
 * Репозиторий сессии разработки: единственный у очереди задачи, запомненный по сессии или выбранный
 * агентом в коротком прогоне. null — агент не понял по задаче и спросил человека: ответ запустит снова.
 */
async function resolveRepo(sessionId: string, mcpServer: string, taskKey: string, state: RunState): Promise<string | null> {
  const repos = readyRepos(agentBridgeTaskQueue(taskKey));
  const remembered = readDevSession(sessionId).repo;
  if (remembered && repos.includes(remembered)) {
    return remembered;
  }
  if (repos.length <= 1) {
    return repos[0] ?? null;
  }
  const names = agentBridgeRepoNames(repos);
  const answer = parseAgentBridgeRouteAnswer(
    await runCli(sessionId, state, {
      args: agentBridgeRouteClaudeArgs({
        mcpServer,
        model,
        repos: repos.map((path) => ({ name: names.get(path) ?? path, path })),
        sessionId,
        taskKey,
      }),
      label: `выбирает репозиторий для ${taskKey}`,
      limitMs: timeoutMs,
    }),
    [...names.values()]
  );
  const repo = repos.find((path) => names.get(path) === answer) ?? null;
  log(sessionId, repo ? `репозиторий: ${repo}` : 'репозиторий не выбран — агент спросил человека');
  return repo;
}

async function runDevSession(sessionId: string, mcpServer: string, taskKey: string, state: RunState) {
  const repo = await resolveRepo(sessionId, mcpServer, taskKey, state);
  if (!repo) {
    return;
  }
  const memory = readDevSession(sessionId);
  // Разговор CLI живёт в своём репозитории: сменился репозиторий — начинаем заново.
  const resumeId = memory.repo === repo ? (memory.cliSessionId ?? null) : null;
  rememberDevSession(sessionId, { cliSessionId: resumeId, repo, taskKey });
  const mcpConfig = mcpConfigFor(mcpServer, process.cwd());
  if (!mcpConfig && !isClaudeAiConnector(mcpServer)) {
    log(sessionId, `MCP-сервер ${mcpServer} не найден в настройках Claude — агент в рабочей копии останется без Beer Tracker`);
  }
  const worktree = prepareWorktree(repo, taskKey, repoCopyPaths(repo));
  await runCli(sessionId, state, {
    args: agentBridgeDevClaudeArgs({
      checks: agentBridgeExpandChecks(repoChecks(repo), worktree),
      mcpConfig,
      mcpServer,
      model,
      resumeId,
      sessionId,
      taskKey,
    }),
    cwd: worktree,
    label: `claude запущен (${mcpServer})`,
    limitMs: devTimeoutMs,
    onCliSession: (cliSessionId) => rememberDevSession(sessionId, { cliSessionId }),
  });
}

/** Сессия живёт на том стенде, откуда пришла просьба, — и MCP берём его. */
function runSession(sessionId: string, mcpServer: string, taskKey?: string) {
  const state: RunState = { again: false, startedAt: Date.now(), step: 'starting', text: '' };
  running.set(sessionId, state);
  const work = taskKey
    ? runDevSession(sessionId, mcpServer, taskKey, state)
    : runCli(sessionId, state, {
        args: agentBridgeClaudeArgs(sessionId, mcpServer, model),
        label: `claude запущен (${mcpServer})`,
        limitMs: timeoutMs,
      });
  work
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      state.error = `bridge_failed: ${message}`;
      log(sessionId, `не запустился: ${message}`);
    })
    .finally(() => {
      running.delete(sessionId);
      recordFinished(sessionId, state);
      if (state.again) {
        runSession(sessionId, mcpServer, taskKey);
      }
    })
    .catch(() => undefined);
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
  return isAgentBridgeTaskKey(taskKey) && readyRepos(agentBridgeTaskQueue(taskKey)).length > 0
    ? { sessionId, taskKey }
    : { error: 'unknown task queue' };
}

type Route = (
  request: IncomingMessage,
  response: ServerResponse,
  origin: string,
  mcpServer: string,
  query: URLSearchParams
) => Promise<void> | void;

const routes: Readonly<Record<string, Route>> = {
  'GET /health': (_request, response, origin) => {
    const runs = [...running].map(([sessionId, { startedAt, step }]) => ({ sessionId, startedAt, step }));
    send(response, 200, origin, { devQueues: readyQueues(), finished: [...finished.values()], runs });
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
  // Кнопки ревью в карточке результата: где рабочая копия сессии разработки.
  'GET /workspace': (_request, response, origin, _mcpServer, query) => {
    const sessionId = query.get('sessionId');
    const workspace = isAgentSessionId(sessionId) ? devWorkspace(sessionId) : null;
    send(response, workspace ? 200 : 404, origin, workspace ?? { error: 'unknown session' });
  },
  // Дифф файла прямо в карточке результата.
  'GET /diff': (_request, response, origin, _mcpServer, query) => {
    const sessionId = query.get('sessionId');
    const path = query.get('path') ?? '';
    const result = isAgentSessionId(sessionId) ? devFileDiff(sessionId, path) : { error: 'invalid sessionId' };
    send(response, 'error' in result ? 404 : 200, origin, result);
  },
  // «Запушить и открыть MR» в карточке результата: push делает человек, кнопкой, не агент.
  'POST /push': async (request, response, origin) => {
    const { sessionId } = JSON.parse(await readBody(request)) as { sessionId?: unknown };
    const result = isAgentSessionId(sessionId) ? pushDevBranch(sessionId) : { error: 'invalid sessionId' };
    send(response, 'error' in result ? 400 : 200, origin, result);
  },
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
  const [pathname = '/', search = ''] = (request.url ?? '/').split('?');
  const route = routes[`${request.method} ${pathname}`];
  if (route) {
    await route(request, response, origin, mcpServer, new URLSearchParams(search));
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
      ...[...targets].map(([origin, mcpServer]) =>
        isClaudeAiConnector(mcpServer) || mcpConfigFor(mcpServer, process.cwd())
          ? `  ${origin} → MCP ${mcpServer}`
          : `  ${origin} → MCP ${mcpServer} (не найден в ~/.claude.json и .mcp.json — сессии разработки останутся без Beer Tracker)`
      ),
      `  CLI: ${claudeBin}, модель ${model}`,
      '',
    ].join('\n')
  );
  announceRepos();
});
