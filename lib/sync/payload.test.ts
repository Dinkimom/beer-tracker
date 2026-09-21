import { describe, expect, it } from 'vitest';

import { parseSyncJobPayload } from './payload';

describe('parseSyncJobPayload', () => {
  it('accepts valid payload', () => {
    const p = parseSyncJobPayload({
      mode: 'incremental',
      organizationId: '00000000-0000-4000-8000-000000000001',
    });
    expect(p.mode).toBe('incremental');
    expect(p.organizationId).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('throws on invalid mode', () => {
    expect(() =>
      parseSyncJobPayload({
        mode: 'nope',
        organizationId: '00000000-0000-4000-8000-000000000001',
      })
    ).toThrow();
  });
});
