import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { upsertRetroBoard } from './retroBoardRepository';
import { type RetroBoard, type RetroCard } from './retroBoardShared';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));

const ORG = '11111111-1111-4111-8111-111111111111';

function card(id: string, text: string): RetroCard {
  return {
    carriesToNext: false,
    color: null,
    columnId: 'glad',
    comments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    id,
    imageDataUrl: null,
    kind: 'note',
    originSprintId: 7,
    reactions: [],
    text,
  };
}

function board(cards: RetroCard[]): RetroBoard {
  return {
    cards,
    columns: [
      { id: 'agreements', preset: 'agreements', role: 'agreements', title: '' },
      { id: 'glad', preset: 'glad', role: null, title: '' },
    ],
    sprintId: 7,
  };
}

describe('upsertRetroBoard: первая заметка на пустой доске', () => {
  beforeEach(() => vi.mocked(query).mockReset());

  it('проиграв гонку вставки, склеивает с доской соседа, а не затирает её', async () => {
    const neighbour = board([card('a', 'From neighbour')]);
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never) // SELECT: доски ещё нет
      .mockResolvedValueOnce({ rows: [] } as never) // INSERT: сосед успел первым
      .mockResolvedValueOnce({ rows: [{ board: neighbour, updated_at: 't1' }] } as never) // SELECT
      .mockResolvedValueOnce({ rows: [{ board: {} }] } as never); // UPDATE
    const saved = await upsertRetroBoard({
      base: null,
      board: board([card('b', 'Mine')]),
      organizationId: ORG,
      sprintId: 7,
    });
    expect(saved?.cards.map((item) => item.id).sort()).toEqual(['a', 'b']);
  });

  it('запись без base по существующей доске — по-прежнему целиком (агент, старые клиенты)', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ board: board([card('a', 'Old')]), updated_at: 't1' }] } as never)
      .mockResolvedValueOnce({ rows: [{ board: {} }] } as never);
    const saved = await upsertRetroBoard({ base: null, board: board([card('b', 'New')]), organizationId: ORG, sprintId: 7 });
    expect(saved?.cards.map((item) => item.id)).toEqual(['b']);
  });
});
