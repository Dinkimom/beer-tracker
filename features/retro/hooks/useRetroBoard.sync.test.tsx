/** @vitest-environment jsdom */

import type { RetroBoard } from '@/lib/retro/retroBoard';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { fetchRetroBoard, saveRetroBoard } from '@/lib/api/sprints';
import { resolveRetroBoard, retroStoreFromBoards } from '@/lib/retro/retroBoard';

import { useRetroBoard } from './useRetroBoard';

vi.mock('@/lib/api/sprints', () => ({ fetchRetroBoard: vi.fn(), saveRetroBoard: vi.fn() }));
vi.mock('@/lib/api/retroColumnTemplate', () => ({ fetchRetroColumnTemplate: vi.fn(() => Promise.resolve([])) }));
vi.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ data: { display: 'Ann', login: 'ann' } }) }));

const SPRINT = 7;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
}

function cardTexts(board: RetroBoard | undefined): string[] {
  return (board?.cards ?? []).map((card) => card.text);
}

describe('useRetroBoard — синхронизация', () => {
  it('перечитывание, начатое до правки, не стирает новую карточку после сохранения', async () => {
    const empty = resolveRetroBoard(retroStoreFromBoards([]), SPRINT);
    vi.mocked(fetchRetroBoard).mockResolvedValueOnce(empty);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useRetroBoard(SPRINT, [{ id: SPRINT } as never], null), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Чужая правка пришла по SSE: доска перечитывается, ответ сервера ещё в пути (старая доска).
    const staleGet = deferred<RetroBoard>();
    vi.mocked(fetchRetroBoard).mockReturnValueOnce(staleGet.promise);
    const save = deferred<RetroBoard>();
    // Сервер подтверждает то, что ему прислали.
    vi.mocked(saveRetroBoard).mockImplementationOnce((_id, board) => save.promise.then(() => board));
    act(() => {
      client.invalidateQueries({ queryKey: ['retroBoard', SPRINT] }).catch(() => undefined);
    });

    // Пока перечитывание в пути, человек добавляет карточку.
    act(() => result.current.addNote(empty.columns[0].id, 'Новая карточка'));
    expect(cardTexts(client.getQueryData(['retroBoard', SPRINT]))).toEqual(['Новая карточка']);

    // Сначала приходит старый ответ GET, затем подтверждение сохранения.
    await act(async () => {
      staleGet.resolve(empty);
      await staleGet.promise;
    });
    await act(async () => {
      save.resolve(empty);
      await save.promise;
      await new Promise((done) => setTimeout(done, 0));
    });

    await waitFor(() =>
      expect(cardTexts(client.getQueryData(['retroBoard', SPRINT]))).toEqual(['Новая карточка'])
    );
  });

  it('чужая карточка, пришедшая во время своего сохранения, и своя — обе остаются', async () => {
    const empty = resolveRetroBoard(retroStoreFromBoards([]), SPRINT);
    vi.mocked(fetchRetroBoard).mockResolvedValueOnce(empty);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useRetroBoard(SPRINT, [{ id: SPRINT } as never], null), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const save = deferred<RetroBoard>();
    vi.mocked(saveRetroBoard).mockImplementationOnce((_id, board) => save.promise.then(() => board));
    act(() => result.current.addNote(empty.columns[0].id, 'Моя'));

    // Во время сохранения коллега добавил свою карточку; событие SSE перечитывает доску.
    const theirs = {
      ...empty,
      cards: [{ ...client.getQueryData<RetroBoard>(['retroBoard', SPRINT])!.cards[0], id: 'their-card', text: 'Чужая' }],
    };
    vi.mocked(fetchRetroBoard).mockResolvedValueOnce(theirs);
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['retroBoard', SPRINT] });
    });
    expect(cardTexts(client.getQueryData(['retroBoard', SPRINT])).sort()).toEqual(['Моя', 'Чужая']);

    await act(async () => {
      save.resolve(empty);
      await save.promise;
      await new Promise((done) => setTimeout(done, 0));
    });
    expect(cardTexts(client.getQueryData(['retroBoard', SPRINT])).sort()).toEqual(['Моя', 'Чужая']);
  });
});
