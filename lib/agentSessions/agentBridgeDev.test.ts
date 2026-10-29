import { describe, expect, it } from 'vitest';

import { agentBridgeStepFromStreamLine } from './agentBridge';
import {
  agentBridgeCliSessionId,
  agentBridgeDevClaudeArgs,
  agentBridgeRepoNames,
  agentBridgeResultText,
  agentBridgeRouteClaudeArgs,
  agentBridgeRunTarget,
  agentBridgeTaskQueue,
  isAgentBridgeTaskKey,
  mergeAgentBridgeRepos,
  parseAgentBridgeQueues,
  parseAgentBridgeRepoConfig,
  parseAgentBridgeRouteAnswer,
} from './agentBridgeDev';

const SESSION_ID = '97a5e91c-9dc6-42fd-ab68-fc0fe5302663';

function toolUse(name: string, input: Record<string, unknown> = {}): string {
  return JSON.stringify({ message: { content: [{ input, name, type: 'tool_use' }] }, type: 'assistant' });
}

describe('agentBridgeDev', () => {
  it('accepts only tracker task keys, which end up in paths and branch names', () => {
    expect(isAgentBridgeTaskKey('RND-1641')).toBe(true);
    expect(isAgentBridgeTaskKey('MY_Q2-7')).toBe(true);
    expect(isAgentBridgeTaskKey('../RND-1')).toBe(false);
    expect(isAgentBridgeTaskKey('rnd-1')).toBe(false);
    expect(isAgentBridgeTaskKey('RND-1; rm -rf')).toBe(false);
    expect(agentBridgeTaskQueue('MY_Q2-7')).toBe('MY_Q2');
  });

  it('reads queue lists from the settings field and file', () => {
    expect(parseAgentBridgeQueues('rnd, WEB;mob  RND, 1x, ')).toEqual(['RND', 'WEB', 'MOB']);
    expect(parseAgentBridgeQueues(['RND', 'bad key'])).toEqual(['RND']);
  });

  it('reads the bridge settings file and drops broken rows', () => {
    expect(
      parseAgentBridgeRepoConfig({
        repos: [
          { confirmed: true, path: '/work/back', queues: ['RND'] },
          { path: '/work/web', queues: ['RND', 'WEB'] },
          { path: '/work/none', queues: [] },
          { path: '', queues: ['OPS'] },
          null,
        ],
      })
    ).toEqual([
      { confirmed: true, path: '/work/back', queues: ['RND'] },
      { confirmed: false, path: '/work/web', queues: ['RND', 'WEB'] },
    ]);
    expect(parseAgentBridgeRepoConfig('garbage')).toEqual([]);
  });

  it('keeps the terminal confirmation per folder, whatever its queues', () => {
    const current = [{ confirmed: true, path: '/work/back', queues: ['RND'] }];
    expect(
      mergeAgentBridgeRepos(current, [
        { path: '/work/back', queues: ['RND', 'OPS'] },
        { path: '/work/web', queues: ['RND'] },
      ])
    ).toEqual([
      { confirmed: true, path: '/work/back', queues: ['RND', 'OPS'] },
      { confirmed: false, path: '/work/web', queues: ['RND'] },
    ]);
  });

  it('names repositories by folder, adding the parent when folders clash', () => {
    expect([...agentBridgeRepoNames(['/a/app', '/b/app', '/c/web']).values()]).toEqual(['a/app', 'b/app', 'web']);
  });

  it('lets the routing run only read and ask, and reads its answer from the last line', () => {
    const args = agentBridgeRouteClaudeArgs({
      mcpServer: 'bt',
      model: 'sonnet',
      repos: [
        { name: 'back', path: '/work/back' },
        { name: 'web', path: '/work/web' },
      ],
      sessionId: SESSION_ID,
      taskKey: 'RND-1641',
    });
    expect(args[args.indexOf('--tools') + 1]).toBe('Read,Glob,Grep,ToolSearch');
    expect(args.filter((arg, index) => args[index - 1] === '--add-dir')).toEqual(['/work/back', '/work/web']);
    expect(args[args.indexOf('--allowedTools') + 1]).not.toContain('Edit');
    const names = ['back', 'web'];
    expect(parseAgentBridgeRouteAnswer('Это API платежей.\nREPO: back', names)).toBe('back');
    expect(parseAgentBridgeRouteAnswer('`REPO: web`', names)).toBe('web');
    expect(parseAgentBridgeRouteAnswer('Спросил человека.\nREPO: ?', names)).toBeNull();
    expect(parseAgentBridgeRouteAnswer('REPO: mobile', names)).toBeNull();
    expect(agentBridgeResultText(JSON.stringify({ result: 'REPO: back', type: 'result' }))).toBe('REPO: back');
    expect(agentBridgeResultText(JSON.stringify({ type: 'assistant' }))).toBeNull();
  });

  it('hands a development session to the bridge only for a known queue', () => {
    const dev = { id: SESSION_ID, kind: 'dev' as const, taskId: 'RND-1641' };
    expect(agentBridgeRunTarget(dev, ['RND'])).toEqual({ sessionId: SESSION_ID, taskKey: 'RND-1641' });
    expect(agentBridgeRunTarget(dev, ['WEB'])).toBeNull();
    expect(agentBridgeRunTarget({ ...dev, taskId: null }, ['RND'])).toBeNull();
    expect(agentBridgeRunTarget({ ...dev, kind: 'plan', taskId: null }, [])).toEqual({ sessionId: SESSION_ID });
  });

  it('lets the agent edit and commit in the worktree, never push or touch the plan', () => {
    const args = agentBridgeDevClaudeArgs({
      bash: ['pnpm test'],
      mcpConfig: '{"mcpServers":{"bt":{"type":"http","url":"http://localhost:3000/api/mcp"}}}',
      mcpServer: 'bt',
      model: 'sonnet',
      resumeId: null,
      sessionId: SESSION_ID,
      taskKey: 'RND-1641',
    });
    const allowed = args[args.indexOf('--allowedTools') + 1].split(',');
    const denied = args[args.indexOf('--disallowedTools') + 1].split(',');
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('acceptEdits');
    // В worktree сервера Beer Tracker может не быть в настройках CLI — передаём явно.
    expect(args[args.indexOf('--mcp-config') + 1]).toContain('"bt"');
    expect(args).not.toContain('--resume');
    expect(args[1]).toContain('agent/RND-1641');
    expect(allowed).toEqual(
      expect.arrayContaining(['Bash(git commit:*)', 'Bash(pnpm test:*)', 'mcp__bt__get_task_brief', 'mcp__bt__transition_issue'])
    );
    expect(denied).toEqual(expect.arrayContaining(['Bash(git push:*)', 'Bash(gh:*)', 'mcp__bt__apply_plan_patch']));
  });

  it('continues the same CLI conversation when the person writes again', () => {
    const args = agentBridgeDevClaudeArgs({
      bash: [],
      mcpConfig: null,
      mcpServer: 'bt',
      model: 'sonnet',
      resumeId: 'cli-1',
      sessionId: SESSION_ID,
      taskKey: 'RND-1641',
    });
    expect(args.slice(args.indexOf('--resume'), args.indexOf('--resume') + 2)).toEqual(['--resume', 'cli-1']);
    expect(args[1]).toContain('новые сообщения');
  });

  it('takes the CLI conversation id from the init event only', () => {
    expect(agentBridgeCliSessionId(JSON.stringify({ session_id: 'cli-1', subtype: 'init', type: 'system' }))).toBe('cli-1');
    expect(agentBridgeCliSessionId(JSON.stringify({ session_id: 'cli-1', type: 'assistant' }))).toBeNull();
    expect(agentBridgeCliSessionId('not json')).toBeNull();
  });

  it('shows what the development agent is doing', () => {
    expect(agentBridgeStepFromStreamLine(toolUse('Grep'))).toBe('exploring');
    expect(agentBridgeStepFromStreamLine(toolUse('Edit'))).toBe('coding');
    expect(agentBridgeStepFromStreamLine(toolUse('Bash', { command: 'pnpm test' }))).toBe('running');
    expect(agentBridgeStepFromStreamLine(toolUse('Bash', { command: 'git add -A && git commit -m "fix"' }))).toBe('committing');
    expect(agentBridgeStepFromStreamLine(toolUse('mcp__bt__get_task_brief'))).toBe('reading');
  });
});
