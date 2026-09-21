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
  /** boardId влияет на выборку задач из CH по команде доски */
  burndown: (sprintId: number, boardId?: number) =>
    `burndown:${sprintId}:${boardId ?? 'na'}`,
  burndownFromPg: (organizationId: string, sprintId: number, boardId?: number) =>
    `burndown:pg:${organizationId}:${sprintId}:${boardId ?? 'na'}`,
  sprints: (boardId: number) => `sprints:${boardId}`,
  sprintInfo: (sprintId: number) => `sprintInfo:${sprintId}`,
  /** POST /issues/_search по filter sprint (задачи спринта). */
  sprintIssues: (sprintId: number) => `sprintIssues:${sprintId}`,
  backlog: (boardId: number, page: number) => `backlog:${boardId}:${page}`,
  /** Бэклог из issue_snapshots (tenant + board + страница + размер страницы). */
  backlogFromPg: (organizationId: string, boardId: number, page: number, perPage: number) =>
    `backlog:pg:${organizationId}:${boardId}:${page}:${perPage}`,
  issueChangelog: (issueKey: string) => `changelog:${issueKey}`,
  /** Детали issue (GET /api/issues/:key) с tenant — избегает утечки кэша между org. */
  issueDetail: (organizationId: string, issueKey: string) =>
    `issue:detail:${organizationId}:${issueKey}`,
  issueFull: (issueKey: string) => `issue:${issueKey}`,
  stories: (boardId: number, page: number, epicKey?: string) =>
    epicKey ? `stories:${boardId}:${page}:epic:${epicKey}` : `stories:${boardId}:${page}`,
  /** Список стори/эпиков из PG (tenant + board + страница). */
  storiesListFromPg: (
    organizationId: string,
    boardId: number,
    page: number,
    perPage: number,
    epicKey?: string | null
  ) =>
    epicKey
      ? `stories:pg:${organizationId}:${boardId}:${page}:n${perPage}:epic:${epicKey}`
      : `stories:pg:${organizationId}:${boardId}:${page}:n${perPage}`,
  story: (storyKey: string) => `story:${storyKey}`,
  storyFromPg: (organizationId: string, storyKey: string) =>
    `story:pg:${organizationId}:${storyKey}`,
  /** Список эпиков из PG. */
  epicsListFromPg: (
    organizationId: string,
    boardId: number,
    page: number,
    perPage: number,
    minYear: number | null
  ) =>
    `epics:pg:${organizationId}:${boardId}:${page}:n${perPage}:y${minYear ?? 'na'}`,
  /** Epic deep из PG. */
  epicDeepFromPg: (organizationId: string, epicKey: string) =>
    `epic:deep:pg:${organizationId}:${epicKey}`,
  storyTasks: (storyKey: string, boardId?: number) =>
    boardId ? `story-tasks:${storyKey}:board:${boardId}` : `story-tasks:${storyKey}`,
  epicTasks: (epicKey: string, boardId?: number) =>
    boardId ? `epic-tasks:${epicKey}:board:${boardId}` : `epic-tasks:${epicKey}`,
  features: (boardId: number) => `features:${boardId}`,
  feature: (featureId: string) => `feature:${featureId}`,
  featureDocuments: (featureId: string) => `feature-documents:${featureId}`,
  documentTypes: () => 'document-types',
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
  /** Полный список пользователей Яндекс Трекера (поиск в админке). */
  trackerUsersList: (fingerprint: string) => `tracker:users:${fingerprint}`,
  /**
   * Gate: аватары staff для org уже обновлены из Jira (in-memory TTL).
   * Пока ключ жив — повторный GET /user не делаем.
   */
  jiraStaffAvatarsRefresh: (organizationId: string) =>
    `jira:staff-avatars:${organizationId}`,
  /** GitLab MR fact (checks + timeline events); TTL 10 мин. */
  gitlabMergeRequestFact: (normalizedLink: string) => `gitlab:mr-fact:${normalizedLink}`,
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
  sprintInfo: (sprintId: number) => {
    apiCache.delete(cacheKeys.sprintInfo(sprintId));
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
  },
  stories: (boardId: number) => {
    apiCache.deleteByPattern(`^stories:${boardId}:`);
    const b = Number(boardId);
    apiCache.deleteByPattern(new RegExp(`^stories:pg:.+:${b}:`));
  },
  story: (storyKey: string) => {
    apiCache.delete(cacheKeys.story(storyKey));
    apiCache.delete(cacheKeys.storyTasks(storyKey));
  },
  epicTasks: (epicKey: string) => {
    const escaped = epicKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    apiCache.deleteByPattern(new RegExp(`^epic-tasks:${escaped}`));
  },
  features: (boardId: number) => {
    apiCache.delete(cacheKeys.features(boardId));
  },
  feature: (featureId: string) => {
    apiCache.delete(cacheKeys.feature(featureId));
    apiCache.delete(cacheKeys.featureDocuments(featureId));
  },
  documentTypes: () => {
    apiCache.delete(cacheKeys.documentTypes());
  },
  /** После смены токена / Cloud Org ID / URL API трекера в админке. */
  adminTrackerCatalogQueuesBoards: (organizationId: string) => {
    const escaped = organizationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    apiCache.deleteByPattern(new RegExp(`^admin:tracker-catalog:qb:${escaped}:`));
  },
};

