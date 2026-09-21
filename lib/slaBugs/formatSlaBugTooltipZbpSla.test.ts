import { describe, expect, it, vi } from 'vitest';

import { formatSlaBugTooltipZbpSla } from './formatSlaBugTooltipZbpSla';

const t = vi.fn((key: string, params?: Record<string, string>) => {
  if (params) {
    return `${key}:${JSON.stringify(params)}`;
  }
  return key;
});

describe('formatSlaBugTooltipZbpSla', () => {
  it('returns no-deadline label when SLA is missing', () => {
    const value = formatSlaBugTooltipZbpSla({
      language: 'ru',
      priority: 'P1',
      t,
    });

    expect(value).toContain('zbpSlaNoDeadline');
  });

  it('formats overdue SLA in days', () => {
    const slaDeadline = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const value = formatSlaBugTooltipZbpSla({
      language: 'ru',
      priority: 'P1',
      slaDeadline,
      t,
    });

    expect(value).toContain('zbpSlaOverdue');
  });

  it('formats future SLA in weeks when far enough', () => {
    const slaDeadline = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
    const value = formatSlaBugTooltipZbpSla({
      language: 'ru',
      priority: 'P1',
      slaDeadline,
      t,
    });

    expect(value).toContain('zbpSlaWeeks');
  });
});
