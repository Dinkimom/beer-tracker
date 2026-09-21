import { describe, expect, it } from 'vitest';

import { translateSprintStatus } from '@/utils/translations';

describe('translateSprintStatus', () => {
  it('maps tracker codes to Russian labels by default', () => {
    expect(translateSprintStatus('draft')).toBe('Черновик');
    expect(translateSprintStatus('in_progress')).toBe('В работе');
    expect(translateSprintStatus('closed')).toBe('Завершен');
    expect(translateSprintStatus('released')).toBe('Выпущен');
    expect(translateSprintStatus('archived')).toBe('Архив');
  });

  it('maps tracker codes to English labels', () => {
    expect(translateSprintStatus('draft', 'en')).toBe('Draft');
    expect(translateSprintStatus('in_progress', 'en')).toBe('In progress');
    expect(translateSprintStatus('closed', 'en')).toBe('Completed');
    expect(translateSprintStatus('released', 'en')).toBe('Released');
    expect(translateSprintStatus('archived', 'en')).toBe('Archive');
  });

  it('normalizes case and returns unknown codes unchanged', () => {
    expect(translateSprintStatus('Draft', 'en')).toBe('Draft');
    expect(translateSprintStatus('IN_PROGRESS', 'ru')).toBe('В работе');
    expect(translateSprintStatus('unknown_status', 'en')).toBe('unknown_status');
  });
});
