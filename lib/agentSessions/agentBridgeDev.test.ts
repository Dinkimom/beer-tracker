import { describe, expect, it } from 'vitest';

import { agentBridgeCloneProgress, agentBridgeCommandFromStreamLine, agentBridgeStepFromStreamLine } from './agentBridge';
import {
  agentBridgeCliSessionId,
  agentBridgeDevClaudeArgs,
  agentBridgeMergeRequestUrl,
  agentBridgeRemoteWebUrl,
  agentBridgeRemoteVariants,
  agentBridgeRepoNames,
  agentBridgeResultText,
  agentBridgeRouteClaudeArgs,
  agentBridgeRunTarget,
  agentBridgeOriginFromGitConfig,
  isAgentBridgeTaskKey,
  parseAgentBridgeLocalCopies,
  parseAgentBridgeNumstat,
  parseAgentBridgeRemote,
  parseAgentBridgeRemotes,
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
  });

  it('builds the merge request link from the origin remote', () => {
    expect(agentBridgeRemoteWebUrl('git@gitlab.example.com:acme/billing.git')).toBe('https://gitlab.example.com/acme/billing');
    expect(agentBridgeRemoteWebUrl('https://user:token@github.com/acme/app.git')).toBe('https://github.com/acme/app');
    expect(agentBridgeRemoteWebUrl('/srv/git/app.git')).toBeNull();
    expect(agentBridgeMergeRequestUrl('https://gitlab.example.com/acme/billing', 'agent/RND-1641')).toBe(
      'https://gitlab.example.com/acme/billing/-/merge_requests/new?merge_request%5Bsource_branch%5D=agent%2FRND-1641'
    );
    expect(agentBridgeMergeRequestUrl('https://github.com/acme/app', 'agent/RND-1')).toBe(
      'https://github.com/acme/app/compare/agent%2FRND-1?expand=1'
    );
  });

  it('reads per-file numbers from git diff --numstat, binary files as zero', () => {
    expect(parseAgentBridgeNumstat('12\t3\tsrc/a.php\n-\t-\tlogo.png\n')).toEqual([
      { deletions: 3, insertions: 12, path: 'src/a.php' },
      { deletions: 0, insertions: 0, path: 'logo.png' },
    ]);
  });

  it('takes clone addresses that map to a folder inside the cache, nothing else', () => {
    expect(parseAgentBridgeRemote('git@gitlab.example.com:team/back.git')).toEqual({
      dir: 'gitlab.example.com/team/back',
      path: 'team/back',
      url: 'git@gitlab.example.com:team/back.git',
    });
    expect(parseAgentBridgeRemote('https://github.com/org/web')?.dir).toBe('github.com/org/web');
    expect(parseAgentBridgeRemote('ssh://git@host:2222/group/sub/app.git')?.dir).toBe('host/group/sub/app');
    expect(parseAgentBridgeRemote('git@host:../etc.git')).toBeNull();
    expect(parseAgentBridgeRemote('/Users/me/work/app')).toBeNull();
    expect(parseAgentBridgeRemote('git@host:team/app.git; rm -rf ~')).toBeNull();
  });

  it('clones over ssh first and falls back to https', () => {
    expect(agentBridgeRemoteVariants('https://gitlab.example.com/team/back')).toEqual([
      'git@gitlab.example.com:team/back.git',
      'https://gitlab.example.com/team/back',
    ]);
    expect(agentBridgeRemoteVariants('git@host:team/web.git')).toEqual(['git@host:team/web.git', 'https://host/team/web.git']);
  });

  it('reads origin from .git/config without running git', () => {
    const config = [
      '[core]',
      '\turl = not-this',
      '[remote "upstream"]',
      '\turl = git@host:fork/app.git',
      '[remote "origin"]',
      '\tfetch = +refs/heads/*:refs/remotes/origin/*',
      '\turl = git@host:team/app.git',
      '[branch "main"]',
    ].join('\n');
    expect(agentBridgeOriginFromGitConfig(config)).toBe('git@host:team/app.git');
    expect(agentBridgeOriginFromGitConfig('[core]\n\tbare = false')).toBeNull();
  });

  it('keeps only absolute local copy folders from the bridge file', () => {
    expect(
      parseAgentBridgeLocalCopies({
        local: { 'host/team/app': '/Users/me/work/app', 'host/team/web': 'relative/web', 'host/../x': '/Users/me/x', 'host/team/api': 7 },
      })
    ).toEqual({ 'host/team/app': '/Users/me/work/app' });
    expect(parseAgentBridgeLocalCopies(null)).toEqual({});
  });

  it('keeps one list of repositories, carrying over the per-queue file of the previous version', () => {
    expect(parseAgentBridgeRemotes({ remotes: ['git@host:team/back.git', 'git@host:team/back.git', '/local/path'] })).toEqual([
      'git@host:team/back.git',
    ]);
    expect(
      parseAgentBridgeRemotes({ queues: { BACK: ['git@host:team/back.git'], RND: ['git@host:team/back.git', 'git@host:team/web.git'] } })
    ).toEqual(['git@host:team/back.git', 'git@host:team/web.git']);
    expect(parseAgentBridgeRemotes('garbage')).toEqual([]);
  });

  it('names repositories by path, adding the group when names clash', () => {
    const names = agentBridgeRepoNames(['git@host:a/app.git', 'git@host:b/app.git', 'git@host:c/web.git']);
    expect([...names.values()]).toEqual(['a/app', 'b/app', 'web']);
  });

  it('lets the routing run only read and ask, and reads a known name or a new address', () => {
    const args = agentBridgeRouteClaudeArgs({
      mcpServer: 'bt',
      model: 'sonnet',
      repos: [
        { history: '/Users/me/.beer-tracker/repos/host/team/back', name: 'back', url: 'git@host:team/back.git' },
        { history: '/Users/me/My Code/web', name: 'web', url: 'git@host:team/web.git' },
        { history: null, name: 'mobile', url: 'git@host:team/mobile.git' },
      ],
      sessionId: SESSION_ID,
      taskKey: 'RND-1641',
    });
    expect(args[args.indexOf('--tools') + 1]).toBe('ToolSearch,Bash');
    expect(args).not.toContain('--add-dir');
    const allowed = args[args.indexOf('--allowedTools') + 1].split(',');
    // Bash — только git log по папкам истории; папка с пробелом сломала бы правило — её нет.
    expect(allowed.filter((tool) => tool.startsWith('Bash'))).toEqual(['Bash(git -C /Users/me/.beer-tracker/repos/host/team/back log:*)']);
    expect(allowed).not.toContain('Edit');
    expect(args[1]).toContain('back: git@host:team/back.git (история: git -C /Users/me/.beer-tracker/repos/host/team/back log)');
    expect(args[1]).toContain('web: git@host:team/web.git (истории на диске нет)');
    expect(args[1]).toContain('--grep');
    const known = new Map([
      ['git@host:team/back.git', 'back'],
      ['git@host:team/web.git', 'web'],
    ]);
    expect(parseAgentBridgeRouteAnswer('Это API платежей.\nREPO: back', known)).toBe('git@host:team/back.git');
    expect(parseAgentBridgeRouteAnswer('`REPO: web`', known)).toBe('git@host:team/web.git');
    expect(parseAgentBridgeRouteAnswer('REPO: git@host:team/mobile.git', known)).toBe('git@host:team/mobile.git');
    // Человек прислал https того же репозитория, что мост знает по ssh, — берём известный адрес.
    expect(parseAgentBridgeRouteAnswer('REPO: https://host/team/back', known)).toBe('git@host:team/back.git');
    expect(parseAgentBridgeRouteAnswer('Спросил человека.\nREPO: ?', known)).toBeNull();
    expect(parseAgentBridgeRouteAnswer('REPO: mobile', known)).toBeNull();
    expect(agentBridgeResultText(JSON.stringify({ result: 'REPO: back', type: 'result' }))).toBe('REPO: back');
    expect(agentBridgeResultText(JSON.stringify({ type: 'assistant' }))).toBeNull();
  });

  it('asks the person for the address when the agent knows no repository yet', () => {
    const args = agentBridgeRouteClaudeArgs({ mcpServer: 'bt', model: 'sonnet', repos: [], sessionId: SESSION_ID, taskKey: 'OPS-7' });
    expect(args[args.indexOf('--tools') + 1]).toBe('ToolSearch');
    expect(args[1]).toContain('Ни одного репозитория');
    expect(args[1]).toContain('git clone');
  });

  it('hands any development task to a bridge that does development', () => {
    const dev = { id: SESSION_ID, kind: 'dev' as const, taskId: 'RND-1641' };
    expect(agentBridgeRunTarget(dev, true)).toEqual({ sessionId: SESSION_ID, taskKey: 'RND-1641' });
    expect(agentBridgeRunTarget(dev, false)).toBeNull();
    expect(agentBridgeRunTarget({ ...dev, taskId: null }, true)).toBeNull();
    expect(agentBridgeRunTarget({ ...dev, kind: 'plan', taskId: null }, false)).toEqual({ sessionId: SESSION_ID });
  });

  it('lets the agent edit and commit in the worktree, never push or touch the plan', () => {
    const args = agentBridgeDevClaudeArgs({
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
    // Окружение и проверки — по правилам самого проекта.
    expect(args[1]).toContain('AGENTS.md');
    expect(allowed).toContain('mcp__claude_ai_Slack__slack_read_thread');
    expect(allowed).toEqual(
      expect.arrayContaining([
        'Bash(git commit:*)',
        'Bash(docker compose:*)',
        'Bash(make:*)',
        'Bash(pnpm:*)',
        'mcp__bt__get_task_brief',
        'mcp__bt__transition_issue',
      ])
    );
    expect(denied).toEqual(expect.arrayContaining(['Bash(git push:*)', 'Bash(gh:*)', 'mcp__bt__apply_plan_patch']));
  });

  it('continues the same CLI conversation when the person writes again', () => {
    const args = agentBridgeDevClaudeArgs({
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

  it('tells setting up the environment from running checks, with the command itself', () => {
    const install = toolUse('Bash', { command: 'docker compose run --rm app composer install\necho done' });
    expect(agentBridgeStepFromStreamLine(install)).toBe('setting_up');
    expect(agentBridgeStepFromStreamLine(toolUse('Bash', { command: 'pnpm i --frozen-lockfile' }))).toBe('setting_up');
    expect(agentBridgeStepFromStreamLine(toolUse('Bash', { command: 'docker compose up -d db' }))).toBe('setting_up');
    expect(agentBridgeStepFromStreamLine(toolUse('Bash', { command: 'make test' }))).toBe('running');
    expect(agentBridgeCommandFromStreamLine(install)).toBe('docker compose run --rm app composer install');
    expect(agentBridgeCommandFromStreamLine(toolUse('Bash', { command: `pnpm test ${'x'.repeat(200)}` }))).toHaveLength(120);
    expect(agentBridgeCommandFromStreamLine(toolUse('Edit'))).toBeNull();
  });

  it('turns git clone progress into one overall percent', () => {
    expect(agentBridgeCloneProgress('Cloning into \'app\'...\nReceiving objects:  10% (1/10)\rReceiving objects:  50% (5/10)\r')).toBe(40);
    expect(agentBridgeCloneProgress('Resolving deltas: 100% (3/3), done.\n')).toBe(95);
    expect(agentBridgeCloneProgress('Updating files:  50% (5/10)\r')).toBe(98);
    expect(agentBridgeCloneProgress('remote: Enumerating objects: 10, done.\n')).toBeNull();
  });
});
