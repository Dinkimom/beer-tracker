import { afterEach, describe, expect, it, vi } from 'vitest';

import { randomUuid } from './randomUuid';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('отдаёт UUID v4, когда randomUUID есть', () => {
    expect(randomUuid()).toMatch(UUID_V4_RE);
  });

  it('без randomUUID (http не с localhost) собирает UUID v4 из getRandomValues', () => {
    const { getRandomValues } = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: getRandomValues.bind(globalThis.crypto) });

    const ids = new Set(Array.from({ length: 50 }, () => randomUuid()));

    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(UUID_V4_RE);
    }
  });
});
