import { gunzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { acceptsGzipEncoding, jsonGzipResponse } from './jsonGzipResponse';

describe('acceptsGzipEncoding', () => {
  it('accepts gzip and gzip with quality', () => {
    expect(acceptsGzipEncoding(null)).toBe(false);
    expect(acceptsGzipEncoding('br, gzip, deflate')).toBe(true);
    expect(acceptsGzipEncoding('gzip;q=1.0, identity;q=0.5')).toBe(true);
    expect(acceptsGzipEncoding('gzip;q=0')).toBe(false);
    expect(acceptsGzipEncoding('deflate')).toBe(false);
  });
});

describe('jsonGzipResponse', () => {
  const bulky = { items: Array.from({ length: 80 }, (_, index) => `task-${index}-${'x'.repeat(20)}`) };

  it('returns plain json when gzip is not accepted', async () => {
    const response = await jsonGzipResponse(bulky, 'identity');
    expect(response.headers.get('Content-Encoding')).toBeNull();
    await expect(response.json()).resolves.toEqual(bulky);
  });

  it('gzips a large payload when the client accepts gzip', async () => {
    const response = await jsonGzipResponse(bulky, 'gzip, deflate, br');
    expect(response.headers.get('Content-Encoding')).toBe('gzip');
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Vary')).toBe('Accept-Encoding');
    const unzipped = gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8');
    expect(JSON.parse(unzipped)).toEqual(bulky);
  });

  it('keeps tiny payloads uncompressed', async () => {
    const response = await jsonGzipResponse({ ok: true }, 'gzip');
    expect(response.headers.get('Content-Encoding')).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
