import type { AppLanguage } from '@/lib/i18n/model';

import { describe, expect, it } from 'vitest';

import { hasTranslation, translate } from '@/lib/i18n/translator';
import { issueTrackerI18nParams } from '@/lib/issueTrackerProvider/issueTrackerUi';

import {
  describeStatsCheckpoint,
  describeSyncProgressMeta,
  redisJobStateLabel,
} from './syncProgressForAdmin';

const ru = (key: string, params?: Record<string, number | string>) =>
  translate('ru' as AppLanguage, key, {
    ...issueTrackerI18nParams((k) => translate('ru' as AppLanguage, k), 'tracker'),
    ...params,
  });
const hasRu = (key: string) => hasTranslation('ru' as AppLanguage, key);

describe('redisJobStateLabel', () => {
  it('maps known states', () => {
    expect(redisJobStateLabel('waiting', ru, hasRu)).toBe('в очереди');
    expect(redisJobStateLabel('active', ru, hasRu)).toBe('выполняется');
  });
});

describe('describeSyncProgressMeta', () => {
  it('formats fetch_queues', () => {
    expect(
      describeSyncProgressMeta(
        {
          issuesCollected: 120,
          page: 3,
          phase: 'fetch_queues',
          queueIndex: 2,
          queueKey: 'ST',
          queueTotal: 5,
          totalPages: 10,
        },
        ru,
      ),
    ).toBe('Очередь ST (2 из 5), страница 3/10 · собрано задач: 120');
  });

  it('formats changelog_fetch start', () => {
    expect(
      describeSyncProgressMeta(
        {
          changelogBatchIndex: 0,
          changelogBatchTotal: 3,
          changelogKeysDone: 0,
          changelogKeysTotal: 250,
          phase: 'changelog_fetch',
        },
        ru,
      ),
    ).toBe('Изменения и комментарии: запрос к Яндекс Трекеру (250 задач)…');
  });

  it('formats changelog_fetch in progress', () => {
    expect(
      describeSyncProgressMeta(
        {
          changelogBatchIndex: 2,
          changelogBatchTotal: 3,
          changelogKeysDone: 200,
          changelogKeysTotal: 250,
          phase: 'changelog_fetch',
        },
        ru,
      ),
    ).toBe('Изменения и комментарии: 200/250 · пакет 2/3');
  });
});

describe('describeStatsCheckpoint', () => {
  it('reads full_sync_checkpoint from stats', () => {
    expect(
      describeStatsCheckpoint(
        {
          full_sync_checkpoint: { page: 1, queue_index: 1, queue_key: 'ST', queue_total: 3, total_pages: 4 },
          issues_total_so_far: 40,
        },
        ru,
      ),
    ).toBe('Очередь ST (1 из 3), страница 1/4 · всего собрано: 40');
  });

  it('prefers changelog_fetch when phase is set', () => {
    expect(
      describeStatsCheckpoint(
        {
          changelog_fetch: { batch_index: 1, batch_total: 2, keys_done: 100, keys_total: 150 },
          full_sync_checkpoint: { page: 1, queue_index: 1, queue_key: 'ST', queue_total: 1, total_pages: 1 },
          phase: 'changelog_fetch',
        },
        ru,
      ),
    ).toBe('Изменения и комментарии: 100/150 · пакет 1/2');
  });
});
