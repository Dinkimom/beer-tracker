import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyFeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';

const fetchFeatureLanes = vi.fn();
const saveFeatureLanes = vi.fn();

vi.mock('@/lib/beerTrackerApi', () => ({
  fetchFeatureLanes: (...args: unknown[]) => fetchFeatureLanes(...args),
  saveFeatureLanes: (...args: unknown[]) => saveFeatureLanes(...args),
}));

import {
  ensureFeatureLanesSessionLoaded,
  getFeatureLanesSession,
  getFeatureLanesSessionLoaded,
  patchFeatureLanesSession,
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
});
