import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchHolidayDayCodes } from './fetchHolidayDayCodes';

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchHolidayDayCodes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses isdayoff for Russia and keeps transferred-day codes', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('isdayoff.ru');
      expect(url).toContain('cc=ru');
      return textResponse('080');
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchHolidayDayCodes('20260306', '20260308', 'ru')).resolves.toBe('080');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to public holidays when isdayoff has no data', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('isdayoff.ru')) {
        return textResponse('101', 404);
      }
      expect(url).toContain('/2026/BY');
      return jsonResponse([
        { date: '2026-05-01', types: ['Public'] },
        { date: '2026-05-04', types: ['Observance'] },
      ]);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchHolidayDayCodes('20260501', '20260504', 'by')).resolves.toBe('8110');
  });

  it('loads public holidays for countries outside the production calendar', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).not.toContain('isdayoff.ru');
      if (url.endsWith('/2026/DE')) {
        return jsonResponse([]);
      }
      expect(url).toContain('/2027/DE');
      return jsonResponse([{ date: '2027-01-01', types: ['Public'] }]);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchHolidayDayCodes('20261231', '20270101', 'de')).resolves.toBe('08');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null for Uzbekistan when isdayoff fails', async () => {
    const fetchMock = vi.fn(() => textResponse('101', 404));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchHolidayDayCodes('20260501', '20260504', 'uz')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
