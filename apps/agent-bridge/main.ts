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
 *
 * `pnpm agent-bridge` читает их из `.env.agent-bridge.local` (пример — `.env.agent-bridge.example`).
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

import {
  AGENT_BRIDGE_DEFAULT_PORT,
  agentBridgeClaudeArgs,
  isAgentBridgeHostAllowed,
  isAgentSessionId,
  parseAgentBridgeTargets,
} from '@/lib/agentSessions/agentBridge';

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

/** Сессия → нужен ли ещё один прогон после текущего (человек дописал, пока агент работал). */
const running = new Map<string, boolean>();

function log(sessionId: string, message: string) {
  process.stdout.write(`[${new Date().toLocaleTimeString()}] ${sessionId.slice(0, 8)} ${message}\n`);
}

/** Сессия живёт на том стенде, откуда пришла просьба, — и MCP берём его. */
function runSession(sessionId: string, mcpServer: string) {
  running.set(sessionId, false);
  log(sessionId, `claude запущен (${mcpServer})`);
  const child = spawn(claudeBin, agentBridgeClaudeArgs(sessionId, mcpServer), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const timer = setTimeout(() => {
    log(sessionId, 'таймаут, останавливаю');
    child.kill('SIGTERM');
  }, timeoutMs);
  child.stdout.on('data', (chunk: Buffer) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));
  const finish = (detail: string) => {
    clearTimeout(timer);
    log(sessionId, detail);
    const again = running.get(sessionId) === true;
    running.delete(sessionId);
    if (again) {
      runSession(sessionId, mcpServer);
    }
  };
  child.on('error', (error) => finish(`не запустился: ${error.message}`));
  child.on('close', (code) => finish(`готово, код ${code ?? '—'}`));
}

function requestRun(sessionId: string, mcpServer: string) {
  if (running.has(sessionId)) {
    running.set(sessionId, true);
    return;
  }
  runSession(sessionId, mcpServer);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 4096) {
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    // Chrome: запрос с публичной страницы на 127.0.0.1 (Private Network Access).
    'Access-Control-Allow-Private-Network': 'true',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

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
  if (request.method === 'GET' && request.url === '/health') {
    send(response, 200, origin, { running: [...running.keys()] });
    return;
  }
  if (request.method === 'POST' && request.url === '/run') {
    const { sessionId } = JSON.parse(await readBody(request)) as { sessionId?: unknown };
    if (!isAgentSessionId(sessionId)) {
      send(response, 400, origin, { error: 'invalid sessionId' });
      return;
    }
    requestRun(sessionId, mcpServer);
    send(response, 202, origin, { ok: true });
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
      `  CLI: ${claudeBin}`,
      '',
    ].join('\n')
  );
});
