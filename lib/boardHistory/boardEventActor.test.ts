import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { describe, expect, it, vi } from 'vitest';

import { runBeerTrackerTransaction } from '@/lib/db';

import { disableBoardEvents, runAsBoardActor, setBoardEventActor, uiBoardActor } from './boardEventActor';

vi.mock('@/lib/db', () => ({ runBeerTrackerTransaction: vi.fn() }));

function recordingTx(): { calls: Array<{ params?: unknown[]; sql: string }>; tx: BeerTrackerTransactionQuery } {
  const calls: Array<{ params?: unknown[]; sql: string }> = [];
  const tx = vi.fn((sql: string, params?: unknown[]) => {
    calls.push({ params, sql });
    return Promise.resolve({ rows: [] });
  }) as unknown as BeerTrackerTransactionQuery;
  return { calls, tx };
}

describe('board event actor', () => {
  it('sets actor, channel and brand as transaction-local settings', async () => {
    const { calls, tx } = recordingTx();
    await setBoardEventActor(tx, { actorId: 'user-1', channel: 'agent', clientBrand: 'claude' });
    expect(calls[0]?.sql).toContain("set_config('beer_tracker.actor_id', $1, true)");
    expect(calls[0]?.params).toEqual(['user-1', 'agent', 'claude']);
  });

  it('runs the write after the actor is set, in the same transaction', async () => {
    const { calls, tx } = recordingTx();
    vi.mocked(runBeerTrackerTransaction).mockImplementation((fn) => fn(tx));
    const result = await runAsBoardActor(uiBoardActor('user-2'), async (run) => {
      await run('DELETE FROM task_links WHERE id = $1', ['L1']);
      return 'done';
    });
    expect(result).toBe('done');
    expect(calls.map((call) => call.params)).toEqual([['user-2', 'ui', ''], ['L1']]);
  });

  it('turns the journal off for service rewrites', async () => {
    const { calls, tx } = recordingTx();
    await disableBoardEvents(tx);
    expect(calls[0]?.sql).toContain("set_config('beer_tracker.board_events', 'off', true)");
  });
});
