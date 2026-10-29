import { describe, expect, it } from 'vitest';

import {
  agentBridgeClaudeArgs,
  agentBridgeStepFromStreamLine,
  agentBridgeTallyUsage,
  agentBridgeUsageTotal,
  EMPTY_AGENT_BRIDGE_USAGE_TALLY,
  tallyAgentBridgeUsage,
  isAgentBridgeHostAllowed,
  isAgentSessionId,
  parseAgentBridgeTargets,
} from './agentBridge';

const SESSION_ID = '3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f';

describe('agentBridge', () => {
  it('accepts only uuid session ids', () => {
    expect(isAgentSessionId(SESSION_ID)).toBe(true);
    expect(isAgentSessionId('rm -rf /')).toBe(false);
    expect(isAgentSessionId(42)).toBe(false);
  });

  it('builds a print-mode call that proposes the plan but writes the retro board', () => {
    const args = agentBridgeClaudeArgs(SESSION_ID, 'beer-tracker', 'sonnet');
    expect(args[0]).toBe('-p');
    expect(args[args.indexOf('--model') + 1]).toBe('sonnet');
    // Из встроенных инструментов Claude Code — подгрузка отложенных MCP-тулов и чтение ссылок.
    expect(args[args.indexOf('--tools') + 1]).toBe('ToolSearch,WebFetch');
    expect(args[1]).toContain(SESSION_ID);
    expect(args[1]).toContain('mcp__beer-tracker__*');
    const allowed = args[args.indexOf('--allowedTools') + 1].split(',');
    const denied = args[args.indexOf('--disallowedTools') + 1].split(',');
    expect(allowed).toContain('mcp__beer-tracker__propose_plan_patch');
    expect(allowed).toContain('mcp__beer-tracker__reply_agent_session');
    expect(allowed).toContain('mcp__beer-tracker__apply_retro_board');
    expect(allowed).not.toContain('mcp__beer-tracker__apply_plan_patch');
    expect(denied).toEqual(['mcp__beer-tracker__apply_plan_patch']);
    // Ссылки из чата и Notion — только чтение.
    expect(allowed).toContain('WebFetch');
    expect(allowed).toContain('mcp__claude_ai_Notion__notion-search');
    expect(allowed).toContain('mcp__claude_ai_Notion__notion-fetch');
    expect(allowed).not.toContain('mcp__claude_ai_Notion__notion-update-page');
  });

  it('accepts only loopback hosts on the bridge port', () => {
    expect(isAgentBridgeHostAllowed('127.0.0.1:47821', 47821)).toBe(true);
    expect(isAgentBridgeHostAllowed('localhost:47821', 47821)).toBe(true);
    expect(isAgentBridgeHostAllowed('evil.example:47821', 47821)).toBe(false);
    expect(isAgentBridgeHostAllowed(undefined, 47821)).toBe(false);
  });

  it('maps each planner origin to its MCP server', () => {
    const targets = parseAgentBridgeTargets(
      ' https://dev.example=beer-tracker-dev , https://bt.example/=claude_ai_BeerTracker,broken,=x'
    );
    expect([...targets]).toEqual([
      ['https://dev.example', 'beer-tracker-dev'],
      ['https://bt.example', 'claude_ai_BeerTracker'],
    ]);
    expect(targets.get('https://evil.example')).toBeUndefined();
  });

  it('reads the agent step from the CLI stream', () => {
    const assistant = (content: unknown[]) => JSON.stringify({ message: { content }, type: 'assistant' });
    expect(agentBridgeStepFromStreamLine(assistant([{ name: 'ToolSearch', type: 'tool_use' }]))).toBe('connecting');
    expect(
      agentBridgeStepFromStreamLine(
        assistant([{ type: 'thinking' }, { name: 'mcp__claude_ai_BeerTracker__get_sprint_context', type: 'tool_use' }])
      )
    ).toBe('studying');
    expect(
      agentBridgeStepFromStreamLine(assistant([{ name: 'mcp__beer-tracker-dev__propose_plan_patch', type: 'tool_use' }]))
    ).toBe('drafting');
    expect(agentBridgeStepFromStreamLine(assistant([{ name: 'mcp__claude_ai_Notion__notion-search', type: 'tool_use' }]))).toBe(
      'searching'
    );
    expect(agentBridgeStepFromStreamLine(assistant([{ name: 'WebFetch', type: 'tool_use' }]))).toBe('reading');
    expect(agentBridgeStepFromStreamLine(assistant([{ text: 'Готово', type: 'text' }]))).toBe('thinking');
    expect(agentBridgeStepFromStreamLine(JSON.stringify({ subtype: 'init', type: 'system' }))).toBeNull();
    expect(agentBridgeStepFromStreamLine('not json')).toBeNull();
  });

  it('tallies tokens per model turn, then takes the final result', () => {
    const turn = (id: string, usage: Record<string, number>) =>
      JSON.stringify({ message: { content: [{ type: 'text' }], id, usage }, type: 'assistant' });
    const lines = [
      JSON.stringify({ subtype: 'init', type: 'system' }),
      turn('msg_1', { cache_creation_input_tokens: 3000, cache_read_input_tokens: 600, input_tokens: 2, output_tokens: 2 }),
      // CLI повторяет usage хода на каждый блок контента — не удваиваем.
      turn('msg_1', { cache_creation_input_tokens: 3000, cache_read_input_tokens: 600, input_tokens: 2, output_tokens: 2 }),
      turn('msg_2', { cache_creation_input_tokens: 100, cache_read_input_tokens: 3600, input_tokens: 1, output_tokens: 5 }),
      'not json',
    ];
    const live = lines.reduce(tallyAgentBridgeUsage, EMPTY_AGENT_BRIDGE_USAGE_TALLY);
    expect(agentBridgeTallyUsage(live)).toEqual({ cacheRead: 4200, cacheWrite: 3100, costUsd: null, input: 3, output: 7 });

    const result = JSON.stringify({
      modelUsage: {
        'claude-haiku': { cacheCreationInputTokens: 0, cacheReadInputTokens: 0, inputTokens: 300, outputTokens: 20 },
        'claude-sonnet': { cacheCreationInputTokens: 3100, cacheReadInputTokens: 4200, inputTokens: 3, outputTokens: 120 },
      },
      total_cost_usd: 0.0123,
      type: 'result',
      usage: { input_tokens: 3, output_tokens: 120 },
    });
    const done = agentBridgeTallyUsage(tallyAgentBridgeUsage(live, result));
    expect(done).toEqual({ cacheRead: 4200, cacheWrite: 3100, costUsd: 0.0123, input: 303, output: 140 });
    expect(agentBridgeUsageTotal(done)).toBe(7743);
  });
});
