/**
 * In-memory кэш для API запросов
 * Используется для кэширования тяжелых запросов на сервере
 */

import type { AxiosInstance } from 'axios';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Получить данные из кэша
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Сохранить данные в кэш
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Удалить запись из кэша
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Удалить все записи, соответствующие паттерну
   */
  deleteByPattern(pattern: RegExp | string): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Очистить истекшие записи
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

const globalForApiCache = globalThis as typeof globalThis & {
  beerTrackerApiCache?: ApiCache;
  beerTrackerApiCacheCleanup?: boolean;
};

export const apiCache = globalForApiCache.beerTrackerApiCache ?? new ApiCache();
globalForApiCache.beerTrackerApiCache = apiCache;

if (typeof setInterval !== 'undefined' && !globalForApiCache.beerTrackerApiCacheCleanup) {
  globalForApiCache.beerTrackerApiCacheCleanup = true;
  setInterval(() => {
    apiCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Подключение к трекеру для ключей кэша метаданных (очереди, воркфлоу, экраны, поля):
 * id полей и экранов уникальны только внутри одной организации трекера (`X-Org-ID`).
 */
export function trackerConnectionCacheScope(api: Pick<AxiosInstance, 'defaults'>): string {
  const defaults = api.defaults as Partial<AxiosInstance['defaults']> | undefined;
  const orgId = String((defaults?.headers as Record<string, unknown> | undefined)?.['X-Org-ID'] ?? '');
  return `${defaults?.baseURL ?? ''}|${orgId}`;
}

/**
 * Генераторы ключей для кэша
 */
export const cacheKeys = {
  burndownFromPg: (organizationId: string, sprintId: number, boardId?: number) =>
    `burndown:pg:${organizationId}:${sprintId}:${boardId ?? 'na'}`,
  /**
   * Номера досок, спринтов и ключи задач у разных трекеров пересекаются, поэтому данные спринтов
   * в кэше лежат под организацией, а метаданные трекера — под подключением (`trackerScope`,
   * см. `trackerConnectionCacheScope`).
   */
  sprints: (organizationId: string, boardId: number) => `sprints:${organizationId}:${boardId}`,
  /** Справочник статусов трекера организации (ключ → тип) для правила «сделано». */
  trackerStatusCatalog: (organizationId: string) => `tracker:status-catalog:${organizationId}`,
  /**
   * Параметры доски Tracker (колонки канбана). fingerprint — токен/URL/org (+ Jira email),
   * чтобы смена интеграции не отдавала чужой кэш.
   */
  boardParams: (fingerprint: string, boardId: number) => `boardParams:${fingerprint}:${boardId}`,
  sprintInfo: (organizationId: string, sprintId: number) => `sprintInfo:${organizationId}:${sprintId}`,
  /** POST /issues/_search по filter sprint (задачи спринта). */
  sprintIssues: (organizationId: string, sprintId: number) => `sprintIssues:${organizationId}:${sprintId}`,
  backlogFromPg: (organizationId: string, boardId: number, page: number, perPage: number) =>
    `backlog:pg:${organizationId}:${boardId}:${page}:${perPage}`,
  /** Детали issue (GET /api/issues/:key) с tenant — избегает утечки кэша между org. */
  issueDetail: (organizationId: string, issueKey: string) =>
    `issue:detail:${organizationId}:${issueKey}`,
  queueWorkflows: (trackerScope: string, queueKey: string) => `queue-workflows:${trackerScope}:${queueKey}`,
  queueByKey: (trackerScope: string, queueKey: string) =>
    `queue-by-key:${trackerScope}:${queueKey.trim().toUpperCase()}`,
  queueIssueTypesConfig: (trackerScope: string, queueKey: string) =>
    `queue-issue-types-config:${trackerScope}:${queueKey.trim().toUpperCase()}`,
  queueWorkflowScreens: (trackerScope: string, queueKey: string) =>
    `queue-workflow-screens:${trackerScope}:${queueKey}`,
  workflow: (trackerScope: string, workflowId: string) => `workflow:${trackerScope}:${workflowId}`,
  screen: (trackerScope: string, screenId: string) => `screen:${trackerScope}:${screenId}`,
  field: (trackerScope: string, fieldId: string) => `field:${trackerScope}:${fieldId}`,
  /**
   * Очереди и доски из Yandex Tracker для админки команд (тяжёлый запрос).
   * fingerprint — хэш связки токен + API URL + Cloud Org ID (смена настроек → новый ключ).
   */
  adminTrackerCatalogQueuesBoards: (organizationId: string, fingerprint: string) =>
    `admin:tracker-catalog:qb:${organizationId}:${fingerprint}`,
  /** Поля / статусы Tracker v3 для админки интеграции (fingerprint — как у каталога). */
  adminTrackerOrgMetadata: (
    organizationId: string,
    fingerprint: string,
    slice: 'fields' | 'statuses'
  ) => `admin:tracker-metadata:${organizationId}:${fingerprint}:${slice}`,
  /** Фиксированные значения поля-списка для коротких подписей на карточке. */
  adminTrackerFieldValues: (organizationId: string, fingerprint: string, fieldId: string) =>
    `admin:tracker-field-values:${organizationId}:${fingerprint}:${fieldId}`,
  /** Полный список пользователей Яндекс Трекера (поиск в админке). */
  /** v2 — полный каталог (до 10k); v1 обрезал на 2000 и ломал поиск по ФИО. */
  trackerUsersList: (fingerprint: string) => `tracker:users:v2:${fingerprint}`,
  /**
   * Gate по одному сотруднику: аватар staff уже сверен с Jira (in-memory TTL).
   * В ключе tracker id — смена привязки к трекеру сразу даёт новую проверку.
   */
  jiraStaffAvatarCheck: (organizationId: string, staffId: string, trackerUserId: string) =>
    `jira:staff-avatar:${organizationId}:${staffId}:${trackerUserId}`,
  /** Org не Jira или без токена трекера — аватары не сверяем до истечения TTL. */
  jiraStaffAvatarsUnavailable: (organizationId: string) =>
    `jira:staff-avatars-unavailable:${organizationId}`,
  /** Live issue links from Tracker/Jira (per issue key); TTL 30 мин. */
  trackerIssueLinks: (organizationId: string, issueKey: string) =>
    `tracker:issue-links:v2:${organizationId}:${issueKey.trim()}`,
};

/**
 * Инвалидация кэша при изменениях
 */
export const invalidateCache = {
  burndown: (sprintId: number) => {
    apiCache.deleteByPattern(new RegExp(`^burndown:${sprintId}:`));
    apiCache.deleteByPattern(new RegExp(`^burndown:pg:.+:${sprintId}:`));
  },
  sprints: (organizationId: string, boardId: number) => {
    apiCache.delete(cacheKeys.sprints(organizationId, boardId));
  },
  backlog: (boardId: number) => {
    apiCache.deleteByPattern(`^backlog:${boardId}:`);
    const b = Number(boardId);
    apiCache.deleteByPattern(new RegExp(`^backlog:pg:.+:${b}:`));
  },
  /** Оценки задачи поменялись — диаграммы сгорания пересчитываются. */
  issueChangelog: () => {
    apiCache.deleteByPattern(/^burndown/);
  },
  issueFull: (issueKey: string) => {
    const escaped = issueKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    apiCache.deleteByPattern(new RegExp(`^issue:detail:.+:${escaped}$`));
  },
  // Инвалидировать все кэши, связанные со спринтом
  sprint: (organizationId: string, sprintId: number) => {
    apiCache.deleteByPattern(new RegExp(`^burndown:${sprintId}:`));
    apiCache.deleteByPattern(new RegExp(`^burndown:pg:.+:${sprintId}:`));
    apiCache.delete(cacheKeys.sprintInfo(organizationId, sprintId));
    apiCache.delete(cacheKeys.sprintIssues(organizationId, sprintId));
    apiCache.deleteByPattern(new RegExp(`^jira:sprint-issues:${sprintId}:`));
    apiCache.deleteByPattern(new RegExp(`^jira:sprint-info:${sprintId}:`));
  },
  adminTrackerCatalogQueuesBoards: (organizationId: string) => {
    const escaped = organizationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    apiCache.deleteByPattern(new RegExp(`^admin:tracker-catalog:qb:${escaped}:`));
  },
  /** Поля / статусы / значения списков для админки и планера. */
  adminTrackerOrgMetadata: (organizationId: string) => {
    const escaped = organizationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    apiCache.deleteByPattern(new RegExp(`^admin:tracker-metadata:${escaped}:`));
    apiCache.deleteByPattern(new RegExp(`^admin:tracker-field-values:${escaped}:`));
  },
  /** Полный каталог трекера организации: проекты/доски + поля/статусы. */
  adminTrackerCatalog: (organizationId: string) => {
    invalidateCache.adminTrackerCatalogQueuesBoards(organizationId);
    invalidateCache.adminTrackerOrgMetadata(organizationId);
  },
};

