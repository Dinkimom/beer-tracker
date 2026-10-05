/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReleaseHoroscopeChip } from './ReleaseHoroscopeChip';

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ language: 'ru', t: (key: string) => key }),
}));

vi.mock('@/hooks/useLocalStorage', () => ({
  useReleaseHoroscopeBirthdateStorage: () => ['1990-12-01', vi.fn()],
  useReleaseHoroscopeEnabledStorage: () => [true, vi.fn()],
}));

vi.mock('@/lib/api/releaseHoroscope', () => ({
  fetchReleaseHoroscopeDay: vi.fn(() =>
    Promise.resolve({
      day: '5',
      monthId: '10',
      signs: [
        {
          comment: 'Deploy after lunch',
          id: 'sagittarius',
          nameEn: 'Sagittarius',
          nameRu: 'Стрелец',
          status: 'good',
          symbol: '♐',
        },
      ],
      year: '2026',
    })
  ),
}));

vi.mock('@/components/releaseHoroscope/ReleaseHoroscopeZodiacIcon', () => ({
  ReleaseHoroscopeZodiacIcon: () => <span data-testid="zodiac-icon" />,
}));

function renderChip() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReleaseHoroscopeChip />
    </QueryClientProvider>
  );
}

describe('ReleaseHoroscopeChip', () => {
  it('shows the horoscope text only after a click and has no border', async () => {
    renderChip();

    const button = await screen.findByRole('button', { name: /Стрелец/ });
    expect(button.className).not.toMatch(/\bborder\b/);
    expect(button.className).toContain('bg-transparent');
    expect(screen.queryByText('Deploy after lunch')).toBeNull();

    fireEvent.click(button);
    expect(screen.getByText('Deploy after lunch')).toBeTruthy();
  });
});
