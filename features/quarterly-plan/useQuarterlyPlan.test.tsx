/** @vitest-environment jsdom */

import type { QuarterlyPlan, QuarterlyPlanContent, QuarterlyPlanNote, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchQuarterlyPlan, saveQuarterlyPlan } from '@/lib/beerTrackerApi';

import { useQuarterlyPlan } from './useQuarterlyPlan';

vi.mock('@/lib/beerTrackerApi', () => ({
  fetchBoardAvailabilityEventsForBoard: vi.fn(),
  fetchQuarterlyPlan: vi.fn(),
  saveQuarterlyPlan: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

const fetchMock = vi.mocked(fetchQuarterlyPlan);
const saveMock = vi.mocked(saveQuarterlyPlan);

const REF: QuarterRef = { quarter: 4, year: 2026 };
const QUERY_KEY = ['quarterlyPlan', REF.year, REF.quarter];

const note = (id: string) => ({ id, row: { id: 'team', kind: 'team' } }) as QuarterlyPlanNote;
const planWith = (...noteIds: string[]): QuarterlyPlan => ({
  ...REF,
  assignments: [],
  directions: [],
  epics: [],
  links: [],
  notes: noteIds.map(note),
  sprintCards: {},
  teams: [],
  trackerEpics: {},
});
const addNote = (id: string) => (content: QuarterlyPlanContent) => ({ ...content, notes: [...content.notes, note(id)] });

type PlanResponse = Awaited<ReturnType<typeof fetchQuarterlyPlan>>;

function deferredFetch() {
  let resolve: (value: PlanResponse) => void = () => {};
  fetchMock.mockReturnValueOnce(
    new Promise<PlanResponse>((done) => {
      resolve = done;
    })
  );
  return (value: PlanResponse) => resolve(value);
}

async function renderLoadedPlan() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  fetchMock.mockResolvedValueOnce({ plan: planWith(), version: 5 });
  const { result } = renderHook(() => useQuarterlyPlan(REF), { wrapper });
  await waitFor(() => expect(result.current.plan).not.toBeNull());
  return { queryClient, result };
}

const savedVersions = () => saveMock.mock.calls.map(([, , ifVersion]) => ifVersion);
const noteIds = (plan: QuarterlyPlan | null) => plan?.notes.map((item) => item.id);

describe('useQuarterlyPlan saving', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('keeps own edit and version when a plan read that started earlier lands after the save', async () => {
    const { queryClient, result } = await renderLoadedPlan();
    const resolveStaleRead = deferredFetch();
    act(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY }).catch(() => undefined);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    saveMock.mockResolvedValueOnce({ version: 6 }).mockResolvedValueOnce({ version: 7 });
    act(() => result.current.applyEdit(addNote('a')));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveStaleRead({ plan: planWith(), version: 5 });
      await Promise.resolve();
    });
    await waitFor(() => expect(queryClient.isFetching({ queryKey: QUERY_KEY })).toBe(0));
    expect(noteIds(result.current.plan)).toEqual(['a']);

    act(() => result.current.applyEdit(addNote('b')));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(2));
    expect(savedVersions()).toEqual([5, 6]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('on a conflict merges own edit into the latest plan and saves again', async () => {
    const { result } = await renderLoadedPlan();
    saveMock.mockResolvedValueOnce({ conflict: true }).mockResolvedValueOnce({ version: 10 });
    fetchMock.mockResolvedValueOnce({ plan: planWith('theirs'), version: 9 });

    act(() => result.current.applyEdit(addNote('mine')));

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(2));
    expect(savedVersions()).toEqual([5, 9]);
    expect(saveMock.mock.calls[1]![1].notes.map((item) => item.id)).toEqual(['mine', 'theirs']);
    await waitFor(() => expect(noteIds(result.current.plan)).toEqual(['mine', 'theirs']));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows a plan changed by someone else and keeps an edit made while it was loading', async () => {
    const { queryClient, result } = await renderLoadedPlan();
    const resolveRead = deferredFetch();
    act(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY }).catch(() => undefined);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    // Своя запись ещё в пути, когда приходит план с чужой правкой.
    let resolveSave: (value: { conflict: true }) => void = () => {};
    saveMock.mockReturnValueOnce(
      new Promise((done) => {
        resolveSave = done;
      })
    );
    act(() => result.current.applyEdit(addNote('mine')));
    await act(async () => {
      resolveRead({ plan: planWith('theirs'), version: 9 });
      await Promise.resolve();
    });
    await waitFor(() => expect(noteIds(result.current.plan)).toEqual(['mine', 'theirs']));

    fetchMock.mockResolvedValueOnce({ plan: planWith('theirs'), version: 9 });
    saveMock.mockResolvedValueOnce({ version: 10 });
    await act(async () => {
      resolveSave({ conflict: true });
      await Promise.resolve();
    });
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(2));
    expect(savedVersions()).toEqual([5, 9]);
    expect(noteIds(result.current.plan)).toEqual(['mine', 'theirs']);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('takes a failed edit off the board and reloads the plan', async () => {
    const { result } = await renderLoadedPlan();
    saveMock.mockRejectedValueOnce(new Error('network'));
    fetchMock.mockResolvedValueOnce({ plan: planWith(), version: 5 });

    act(() => result.current.applyEdit(addNote('lost')));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('quarterlyPlan.saveError'));
    await waitFor(() => expect(noteIds(result.current.plan)).toEqual([]));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('does not save again a plan the same client wrote past the board', async () => {
    const { queryClient, result } = await renderLoadedPlan();
    const approved = planWith('approved');

    act(() => {
      result.current.setVersion(6, approved);
      queryClient.setQueryData(QUERY_KEY, approved);
    });
    await waitFor(() => expect(noteIds(result.current.plan)).toEqual(['approved']));

    expect(saveMock).not.toHaveBeenCalled();
    expect(result.current.getVersion()).toBe(6);
  });
});
