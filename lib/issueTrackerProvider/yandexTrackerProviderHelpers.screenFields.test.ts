import type { AxiosInstance } from 'axios';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchScreen, getTransitionScreenFields } from '@/lib/trackerApi';

import { getYandexScreenFields, getYandexTransitionFields } from './yandexTrackerProviderHelpers';

vi.mock('@/lib/trackerApi', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchField: vi.fn(() => Promise.resolve(null)),
  fetchScreen: vi.fn(),
  getTransitionScreenFields: vi.fn(),
}));

const api = {} as AxiosInstance;

describe('Yandex transition screen fields', () => {
  beforeEach(() => {
    vi.mocked(fetchScreen).mockReset();
    vi.mocked(getTransitionScreenFields).mockReset();
  });

  // Пустой экран не значит «нужен комментарий»: иначе модалка открывается на любой переход.
  // Обязательный комментарий трекер возвращает ответом 422 (TransitionRequiresFieldsError).
  it('returns no fields for an empty screen', async () => {
    vi.mocked(fetchScreen).mockResolvedValue({ elements: [] } as never);
    await expect(getYandexScreenFields('screen-1', api)).resolves.toEqual([]);
  });

  it('returns no fields when the transition has no screen fields', async () => {
    vi.mocked(getTransitionScreenFields).mockResolvedValue(null);
    await expect(getYandexTransitionFields('ABC-1', 'close', api)).resolves.toEqual([]);
  });
});
