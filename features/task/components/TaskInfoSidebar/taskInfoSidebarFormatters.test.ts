import { describe, expect, it } from 'vitest';

import {
  buildTaskInfoTimestampsLine,
  formatTaskInfoAbsoluteDateTime,
  formatTaskInfoDateTime,
  resolveTaskInfoBreadcrumb,
  resolveTaskInfoBreadcrumbParts,
  resolveTaskInfoQueueKey,
} from './taskInfoSidebarFormatters';

const labels = {
  todayAt: (time: string) => `сегодня в ${time}`,
  yesterdayAt: (time: string) => `вчера в ${time}`,
};

const yandexTracker = {
  kind: 'tracker' as const,
  webBaseUrl: 'https://tracker.yandex.ru',
};

const jiraTracker = {
  kind: 'jira-onprem' as const,
  webBaseUrl: 'https://jira.example.com',
};

describe('taskInfoSidebarFormatters', () => {
  it('formatTaskInfoDateTime returns null for invalid dates', () => {
    expect(formatTaskInfoDateTime(undefined, 'ru-RU', labels)).toBeNull();
    expect(formatTaskInfoDateTime('bad', 'ru-RU', labels)).toBeNull();
  });

  it('formatTaskInfoAbsoluteDateTime uses padded day and comma before time', () => {
    const date = new Date(2026, 6, 3, 14, 0, 0);
    expect(formatTaskInfoAbsoluteDateTime(date, 'ru-RU')).toBe('03 июл, 14:00');
    expect(formatTaskInfoAbsoluteDateTime(date, 'en-US')).toMatch(/^03 Jul, 14:00$/i);
  });

  it('formatTaskInfoDateTime uses today and yesterday relative labels', () => {
    const now = new Date(2026, 6, 24, 12, 0, 0);
    const today = new Date(2026, 6, 24, 15, 16, 0).toISOString();
    const yesterday = new Date(2026, 6, 23, 15, 16, 0).toISOString();
    const older = new Date(2026, 6, 3, 14, 0, 0).toISOString();

    expect(formatTaskInfoDateTime(today, 'ru-RU', labels, now)).toBe('сегодня в 15:16');
    expect(formatTaskInfoDateTime(yesterday, 'ru-RU', labels, now)).toBe('вчера в 15:16');
    expect(formatTaskInfoDateTime(older, 'ru-RU', labels, now)).toBe('03 июл, 14:00');
  });

  it('buildTaskInfoTimestampsLine joins created and updated', () => {
    const line = buildTaskInfoTimestampsLine('03 июл, 14:00', 'вчера в 15:16', (key, params) => {
      if (key.endsWith('createdAt')) {
        return `Создано ${params?.date}`;
      }
      return `обновлено ${params?.date}`;
    });
    expect(line).toBe('Создано 03 июл, 14:00, обновлено вчера в 15:16');
  });

  it('resolveTaskInfoQueueKey uses trackerQueue or parses issue key', () => {
    expect(
      resolveTaskInfoQueueKey(
        { id: 'DEV-948', link: '', name: 'T', team: 'Web', trackerQueue: 'NOTIF' },
        'DEV-948'
      )
    ).toBe('NOTIF');
    expect(
      resolveTaskInfoQueueKey({ id: 'DEV-948', link: '', name: 'T', team: 'Web' }, 'DEV-948')
    ).toBe('DEV');
  });

  it('resolveTaskInfoBreadcrumbParts includes queue name and parent url', () => {
    const parts = resolveTaskInfoBreadcrumbParts(
      {
        id: 'DEV-948',
        link: '',
        name: 'T',
        team: 'Web',
        trackerQueueName: 'Community notifications',
        parent: {
          display: 'Story title',
          id: 'p',
          key: 'ST-1',
          self: 'https://tracker.yandex.ru/ST-1',
        },
      },
      'DEV-948',
      yandexTracker
    );
    expect(parts.queueLabel).toBe('Community notifications');
    expect(parts.queueUrl).toBe('https://tracker.yandex.ru/DEV');
    expect(parts.parent).toEqual({
      key: 'ST-1',
      label: 'Story title',
      url: 'https://tracker.yandex.ru/ST-1',
    });
  });

  it('resolveTaskInfoBreadcrumbParts builds Jira browse/project URLs and ignores API self', () => {
    const parts = resolveTaskInfoBreadcrumbParts(
      {
        id: 'DEV-948',
        link: '',
        name: 'T',
        parent: {
          display: 'Story title',
          id: 'p',
          key: 'ST-1',
          self: 'https://jira.example.com/rest/api/2/issue/100',
        },
        team: 'Web',
        trackerQueueName: 'Notifications',
      },
      'DEV-948',
      jiraTracker
    );
    expect(parts.queueUrl).toBe('https://jira.example.com/projects/DEV');
    expect(parts.parent).toEqual({
      key: 'ST-1',
      label: 'Story title',
      url: 'https://jira.example.com/browse/ST-1',
    });
  });

  it('resolveTaskInfoBreadcrumb prefers parent then epic', () => {
    expect(
      resolveTaskInfoBreadcrumb({
        id: '1',
        link: '',
        name: 'T',
        team: 'Web',
        parent: { display: 'Story', id: 'p', key: 'ST-1' },
      })
    ).toBe('Story');
    expect(
      resolveTaskInfoBreadcrumb({
        id: '1',
        link: '',
        name: 'T',
        team: 'Web',
        epic: { display: 'Epic', id: 'e', key: 'EP-1' },
      })
    ).toBe('Epic');
    expect(
      resolveTaskInfoBreadcrumb({
        id: '1',
        link: '',
        name: 'T',
        team: 'Web',
      })
    ).toBeNull();
  });
});
