import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as boardsTransport from '@/lib/layers/transport/boardsTransport';

import { loadBoardsForPlanner } from './boardsRepository';

describe('loadBoardsForPlanner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns data when transport succeeds', async () => {
    vi.spyOn(boardsTransport, 'fetchBoardsTransport').mockResolvedValue({
      data: [{ id: 1, name: 'A', queue: 'q', team: 't', teamTitle: 'Team A' }],
      ok: true,
    });
    const r = await loadBoardsForPlanner();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toHaveLength(1);
  });

  it('passes through transport error', async () => {
    vi.spyOn(boardsTransport, 'fetchBoardsTransport').mockResolvedValue({
      error: new Error('net'),
      ok: false,
    });
    const r = await loadBoardsForPlanner();
    expect(r.ok).toBe(false);
  });
});
