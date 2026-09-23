/**
 * Типы для работы с Yandex Tracker API
 * Эти типы используются как на сервере, так и на клиенте
 */

export interface SprintObject {
  display: string;
  id: string;
}

export interface SprintInfo {
  endDate: string;
  endDateTime: string;
  id: number;
  name: string;
  startDate: string;
  startDateTime: string;
  status: string;
  version?: number; // Версия спринта для оптимистичной блокировки (If-Match)
}

export interface SprintListItem {
  archived: boolean;
  board: {
    display: string;
    id: string;
    self: string;
  };
  createdAt: string;
  createdBy: {
    cloudUid: string;
    display: string;
    id: string;
    passportUid: number;
    self: string;
  };
  endDate: string;
  endDateTime: string;
  id: number;
  name: string;
  /** Опциональная метка квартала для отображения (если есть в payload). */
  quarter?: string | null;
  self: string;
  startDate: string;
  startDateTime: string;
  status: string;
  version: number;
}

export interface ChecklistItem {
  checked: boolean;
  checklistItemType: string;
  id: string;
  text: string;
  textHtml?: string;
}

export interface TrackerIssue {
  assignee?: {
    display: string;
    id: string;
  };
  bizErpTeam?: string[];
  checklistDone?: number;
  checklistItems?: ChecklistItem[];
  checklistTotal?: number;
  createdAt?: string;
  dangerousRelease?: boolean | number | string | { display?: string; key?: string } | null;
  /** Дедлайн задачи (YYYY-MM-DD или datetime), поле Tracker `deadline` / Jira `duedate`. */
  deadline?: string;
  description?: string;
  /**
   * Эпик из Tracker API.
   * Поле приходит в ответе issues/_search, если задача привязана к эпику.
   */
  epic?: {
    display: string;
    id: string;
    key: string;
    self: string;
  } | null;
  functionalTeam?: string;
  /** Число обращений в HD. */
  HD_count?: number;
  /** Рост HD_count за 7 дней. */
  HD_growth7d?: number;
  /** Рост HD_count за 24 часа. */
  HD_growth24h?: number;
  id: string;
  incidentSeverity?: string | { display?: string; key?: string };
  key: string;
  /** Ключевой клиент. */
  key_client?: boolean | string;
  /** Дата последнего обращения HD. */
  lastHDAt?: string;
  /** Кастомное поле Tracker с ссылкой на MR */

  MergeRequestLink?: string;
  parent?: {
    display: string;
    id: string;
    key: string;
    self: string;
  };
  priority?: {
    display: string;
    key: string;
  };
  qaEngineer?: {
    display: string;
    id: string;
  };
  /**
   * Очередь Tracker (приходит в issues/_search и GET issue).
   */
  queue?:
    | string
    | {
        display?: string;
        id?: string;
        key?: string;
        self?: string;
      };
  /** Дата закрытия (resolved) в Tracker. */
  resolvedAt?: string;
  self: string;
  /** Дедлайн SLA. */
  slaDeadline?: string;
  sprint?: Array<{
    display: string;
    id: string;
  }> | string | { display: string, id: string; };
  stage?: string;
  /** Дата начала (YYYY-MM-DD или datetime), поле Tracker `start`. */
  start?: string;
  status?: {
    display: string;
    /** Tracker status id (Jira numeric id) — for admin override lookup keyed by id. */
    id?: string;
    key: string;
  };
  statusType?: {
    display: string;
    key: string;
  };
  storyPoints?: number;
  summary: string;
  /** Пуш приоритета от поддержки. */
  sup_priority?: boolean | string;
  testPoints?: number;
  type?: {
    key: string;
    display: string;
  };
  /** Дата последнего обновления задачи в Tracker (инкрементальный sync). */
  updatedAt?: string;
}

export interface ChangelogEntry {
  createdBy?: {
    display?: string;
    id?: string;
  };
  fields?: Array<{
    field: {
      display: string;
      id: string;
    };
    from?: {
      display: string;
      id: string;
      key: string;
    } | null;
    to?: {
      display: string;
      id: string;
      key: string;
    } | null;
  }>;
  id: string;
  type: string;
  updatedAt: string;
}

export interface IssueComment {
  createdAt: string;
  createdBy: {
    id: string;
    display: string;
    cloudUid?: string;
    passportUid?: number;
  };
  id: number;
  text: string;
  textHtml?: string;
  updatedAt: string;
  updatedBy?: {
    id: string;
    display: string;
  };
}

export interface IssueChangelogWithComments {
  changelog: ChangelogEntry[];
  comments: IssueComment[];
}

/** Статус в колонке доски (GET /v3/boards/<id>/columns) */
interface BoardColumnStatus {
  display: string;
  id: string;
  key: string;
  self: string;
}

/** Колонка доски из API (GET /v3/boards/<id>/columns) */
export interface TrackerBoardColumnResponse {
  id: number;
  name: string;
  self: string;
  statuses: BoardColumnStatus[];
}

/** Колонка доски для канбана (id и display для UI, statusKeys для сопоставления задач по task.originalStatus) */
export interface BoardColumn {
  display: string;
  id: string;
  self?: string;
  /** Ключи статусов, входящих в колонку (из API /boards/<id>/columns) */
  statusKeys?: string[];
}

/** Параметры доски из API Трекера */
export interface BoardParams {
  columns: BoardColumn[];
  createdAt?: string;
  id: number;
  name: string;
  self: string;
  updatedAt?: string;
  version?: number;
}

