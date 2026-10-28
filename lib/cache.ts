/**
 * In-memory кэш для API запросов
 * Используется для кэширования тяжелых запросов на сервере
 */

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
 * Генераторы ключей для кэша
 */
export const cacheKeys = {
  burndownFromPg: (organizationId: string, sprintId: number, boardId?: number) =>
    `burndown:pg:${organizationId}:${sprintId}:${boardId ?? 'na'}`,
  sprints: (boardId: number) => `sprints:${boardId}`,
  /** Справочник статусов трекера организации (ключ → тип) для правила «сделано». */
  trackerStatusCatalog: (organizationId: string) => `tracker:status-catalog:${organizationId}`,
  /**
   * Параметры доски Tracker (колонки канбана). fingerprint — токен/URL/org (+ Jira email),
   * чтобы смена интеграции не отдавала чужой кэш.
   */
  boardParams: (fingerprint: string, boardId: number) => `boardParams:${fingerprint}:${boardId}`,
  sprintInfo: (sprintId: number) => `sprintInfo:${sprintId}`,
  /** POST /issues/_search по filter sprint (задачи спринта). */
  sprintIssues: (sprintId: number) => `sprintIssues:${sprintId}`,
  backlogFromPg: (organizationId: string, boardId: number, page: number, perPage: number) =>
    `backlog:pg:${organizationId}:${boardId}:${page}:${perPage}`,
  issueChangelog: (issueKey: string) => `changelog:${issueKey}`,
  /** Детали issue (GET /api/issues/:key) с tenant — избегает утечки кэша между org. */
  issueDetail: (organizationId: string, issueKey: string) =>
    `issue:detail:${organizationId}:${issueKey}`,
  issueFull: (issueKey: string) => `issue:${issueKey}`,
  queueWorkflows: (queueKey: string) => `queue-workflows:${queueKey}`,
  queueByKey: (queueKey: string) => `queue-by-key:${queueKey.trim().toUpperCase()}`,
  queueIssueTypesConfig: (queueKey: string) =>
    `queue-issue-types-config:${queueKey.trim().toUpperCase()}`,
  queueWorkflowScreens: (queueKey: string) => `queue-workflow-screens:${queueKey}`,
  workflow: (workflowId: string) => `workflow:${workflowId}`,
  screen: (screenId: string) => `screen:${screenId}`,
  field: (fieldId: string) => `field:${fieldId}`,
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
   * Gate: аватары staff для org уже обновлены из Jira (in-memory TTL).
   * Пока ключ жив — повторный GET /user не делаем.
   */
  jiraStaffAvatarsRefresh: (organizationId: string) =>
    `jira:staff-avatars:${organizationId}`,
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
  sprints: (boardId: number) => {
    apiCache.delete(cacheKeys.sprints(boardId));
  },
  backlog: (boardId: number) => {
    apiCache.deleteByPattern(`^backlog:${boardId}:`);
    const b = Number(boardId);
    apiCache.deleteByPattern(new RegExp(`^backlog:pg:.+:${b}:`));
  },
  issueChangelog: (issueKey: string) => {
    apiCache.delete(cacheKeys.issueChangelog(issueKey));
    apiCache.deleteByPattern(/^burndown/);
  },
  issueFull: (issueKey: string) => {
    apiCache.delete(cacheKeys.issueFull(issueKey));
    const escaped = issueKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    apiCache.deleteByPattern(new RegExp(`^issue:detail:.+:${escaped}$`));
  },
  // Инвалидировать все кэши, связанные со спринтом
  sprint: (sprintId: number) => {
    apiCache.deleteByPattern(new RegExp(`^burndown:${sprintId}:`));
    apiCache.deleteByPattern(new RegExp(`^burndown:pg:.+:${sprintId}:`));
    apiCache.delete(cacheKeys.sprintInfo(sprintId));
    apiCache.delete(cacheKeys.sprintIssues(sprintId));
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

