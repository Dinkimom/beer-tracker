/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useDeveloperCalDavCredentialsStorage,
  useHasDeveloperCalDavCredentials,
} from '@/hooks/useLocalStorage';

const SAMPLE_URL =
  'https://calendar.mail.ru/principals/example.com/jane.doe/calendars/00000000-0000-4000-8000-000000000001/';

describe('useDeveloperCalDavCredentialsStorage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      localStorage: globalThis.localStorage,
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists credentials for a developer id', () => {
    const { result } = renderHook(() => useDeveloperCalDavCredentialsStorage('dev-1'));

    act(() => {
      result.current[1]({
        appPassword: 'secret',
        caldavUrl: SAMPLE_URL,
        email: 'jane.doe@example.com',
      });
    });

    expect(result.current[0]).toMatchObject({
      appPassword: 'secret',
      caldavUrl: SAMPLE_URL,
      email: 'jane.doe@example.com',
    });
  });

  it('clears credentials when set to null', () => {
    const { result } = renderHook(() => useDeveloperCalDavCredentialsStorage('dev-1'));

    act(() => {
      result.current[1]({
        appPassword: 'secret',
        caldavUrl: SAMPLE_URL,
        email: 'jane.doe@example.com',
      });
    });
    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
  });
});

describe('useHasDeveloperCalDavCredentials', () => {
  it('is false when no CalDAV credentials are stored', () => {
    const { result } = renderHook(() => useHasDeveloperCalDavCredentials());
    expect(result.current).toBe(false);
  });

  it('is true after credentials are saved', () => {
    const { result: save } = renderHook(() => useDeveloperCalDavCredentialsStorage('dev-1'));
    act(() => {
      save.current[1]({
        appPassword: 'secret',
        caldavUrl: SAMPLE_URL,
        email: 'jane.doe@example.com',
      });
    });

    const { result } = renderHook(() => useHasDeveloperCalDavCredentials());
    expect(result.current).toBe(true);
  });
});
