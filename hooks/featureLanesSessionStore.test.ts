import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyFeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';

const fetchFeatureLanes = vi.fn();
const saveFeatureLanes = vi.fn();

vi.mock('@/lib/beerTrackerApi', () => ({
  fetchFeatureLanes: (...args: unknown[]) => fetchFeatureLanes(...args),
  saveFeatureLanes: (...args: unknown[]) => saveFeatureLanes(...args),
}));

import {
  applyRemoteFeatureLanesSession,
  ensureFeatureLanesSessionLoaded,
  getFeatureLanesSession,
  getFeatureLanesSessionLoaded,
  patchFeatureLanesSession,
  reloadFeatureLanesSession,
  resetFeatureLanesSessionForTests,
  subscribeFeatureLanesSession,
} from './featureLanesSessionStore';

describe('featureLanesSessionStore', () => {
  beforeEach(() => {
    resetFeatureLanesSessionForTests();
    fetchFeatureLanes.mockReset();
    saveFeatureLanes.mockReset();
    saveFeatureLanes.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetFeatureLanesSessionForTests();
  });

  it('отдаёт один документ всем подписчикам спринта', () => {
    const seen: Array<ReturnType<typeof getFeatureLanesSession>> = [];
    const unsubscribe = subscribeFeatureLanesSession(4, () => {
      seen.push(getFeatureLanesSession(4));
    });
    patchFeatureLanesSession(4, () => ({
      ...emptyFeatureLanesDocument(),
      draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-1'], name: 'Пупи' }],
    }));
    expect(getFeatureLanesSession(4)?.draftRows[0]?.issueKeys).toEqual(['BT-1']);
    expect(seen.at(-1)?.draftRows[0]?.issueKeys).toEqual(['BT-1']);
    unsubscribe();
  });

  it('не затирает локальный сброс issueKeys ответом загрузки', async () => {
    let resolveFetch: ((value: ReturnType<typeof emptyFeatureLanesDocument>) => void) | undefined;
    fetchFeatureLanes.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    ensureFeatureLanesSessionLoaded(4);
    patchFeatureLanesSession(4, () => ({
      ...emptyFeatureLanesDocument(),
      draftRows: [{ id: 'feature-draft:1', issueKeys: [], name: 'Пупи' }],
    }));
    resolveFetch?.({
      ...emptyFeatureLanesDocument(),
      draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-1'], name: 'Пупи' }],
    });
    await Promise.resolve();
    expect(getFeatureLanesSession(4)?.draftRows[0]?.issueKeys).toEqual([]);
  });

  it('помечает сессию загруженной и уведомляет, даже если документ уже правили локально', async () => {
    let resolveFetch: ((value: ReturnType<typeof emptyFeatureLanesDocument>) => void) | undefined;
    fetchFeatureLanes.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    const seenLoaded: boolean[] = [];
    const unsubscribe = subscribeFeatureLanesSession(4, () => {
      seenLoaded.push(getFeatureLanesSessionLoaded(4));
    });
    ensureFeatureLanesSessionLoaded(4);
    expect(getFeatureLanesSessionLoaded(4)).toBe(false);
    patchFeatureLanesSession(4, () => emptyFeatureLanesDocument());
    resolveFetch?.(emptyFeatureLanesDocument());
    await Promise.resolve();
    expect(getFeatureLanesSessionLoaded(4)).toBe(true);
    expect(seenLoaded.at(-1)).toBe(true);
    unsubscribe();
  });

  it('принимает документ, записанный в обход сессии, только если сессия загружена и чистая', async () => {
    const remote = {
      ...emptyFeatureLanesDocument(),
      draftRows: [{ id: 'ST-9', name: 'Стори' }],
    };
    applyRemoteFeatureLanesSession(4, remote);
    expect(getFeatureLanesSession(4)).toBeUndefined();

    fetchFeatureLanes.mockResolvedValue(emptyFeatureLanesDocument());
    ensureFeatureLanesSessionLoaded(4);
    await vi.waitFor(() => expect(getFeatureLanesSessionLoaded(4)).toBe(true));
    applyRemoteFeatureLanesSession(4, remote);
    expect(getFeatureLanesSession(4)).toBe(remote);

    patchFeatureLanesSession(4, () => emptyFeatureLanesDocument());
    applyRemoteFeatureLanesSession(4, remote);
    expect(getFeatureLanesSession(4)?.draftRows).toEqual([]);
  });

  it('перечитывает документ по realtime, если локальных правок нет', async () => {
    fetchFeatureLanes.mockResolvedValue(emptyFeatureLanesDocument());
    ensureFeatureLanesSessionLoaded(4);
    await vi.waitFor(() => expect(getFeatureLanesSessionLoaded(4)).toBe(true));
    fetchFeatureLanes.mockResolvedValue({
      ...emptyFeatureLanesDocument(),
      draftRows: [{ id: 'ST-9', name: 'Стори' }],
    });
    await reloadFeatureLanesSession(4);
    expect(getFeatureLanesSession(4)?.draftRows).toEqual([{ id: 'ST-9', name: 'Стори' }]);

    fetchFeatureLanes.mockClear();
    await reloadFeatureLanesSession(99);
    expect(fetchFeatureLanes).not.toHaveBeenCalled();
  });
});
