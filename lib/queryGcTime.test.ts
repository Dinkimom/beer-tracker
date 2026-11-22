// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { clientGcTime } from './queryGcTime';

describe('clientGcTime', () => {
  it('на сервере не заводит таймер сборки кэша', () => {
    expect(clientGcTime(1000 * 60 * 60 * 24)).toBe(Number.POSITIVE_INFINITY);
  });
});
