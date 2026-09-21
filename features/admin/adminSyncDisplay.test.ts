import type { AppLanguage } from '@/lib/i18n/model';

import { describe, expect, it } from 'vitest';

import {
  formatSyncJobType,
  formatSyncRunStatus,
  syncRunStatusWordClass,
} from '@/features/admin/adminSyncDisplay';
import { hasTranslation, translate } from '@/lib/i18n/translator';

const ru = (key: string, params?: Record<string, number | string>) =>
  translate('ru' as AppLanguage, key, params);
const hasRu = (key: string) => hasTranslation('ru' as AppLanguage, key);

describe('formatSyncRunStatus', () => {
  it('maps known statuses', () => {
    expect(formatSyncRunStatus('success', ru, hasRu)).toBe('успешно');
    expect(formatSyncRunStatus('failed', ru, hasRu)).toBe('ошибка');
  });

  it('passes through unknown', () => {
    expect(formatSyncRunStatus('weird', ru, hasRu)).toBe('weird');
  });
});

describe('formatSyncJobType', () => {
  it('maps known job types', () => {
    expect(formatSyncJobType('full_rescan', ru, hasRu)).toBe('полная пересборка');
    expect(formatSyncJobType('incremental', ru, hasRu)).toBe('инкрементальная синхронизация');
  });

  it('returns null for empty', () => {
    expect(formatSyncJobType(null, ru, hasRu)).toBeNull();
    expect(formatSyncJobType('', ru, hasRu)).toBeNull();
  });
});

describe('syncRunStatusWordClass', () => {
  it('maps terminal and in-flight statuses', () => {
    expect(syncRunStatusWordClass('success')).toContain('green');
    expect(syncRunStatusWordClass('failed')).toContain('red');
    expect(syncRunStatusWordClass('partial')).toContain('amber');
    expect(syncRunStatusWordClass('running')).toContain('blue');
  });

  it('uses neutral for unknown', () => {
    expect(syncRunStatusWordClass('weird')).toContain('gray-700');
  });
});
