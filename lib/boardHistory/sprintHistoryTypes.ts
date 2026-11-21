/**
 * История изменений спринта: ответ `GET /api/sprints/:id/history`.
 * Два источника: события задач из changelog трекера (`issue_field_events`) и журнал
 * объектов доски — заметок, целей, стрелок (`board_object_events`).
 */

/** ui — человек в интерфейсе, agent — агент или его черновик, system — служебная правка; null — неизвестно. */
export type SprintHistoryChannel = 'agent' | 'system' | 'ui';

export interface SprintHistoryActor {
  channel: SprintHistoryChannel | null;
  /** Клиент агента (claude, cursor…). */
  clientBrand: string | null;
  id: string | null;
  name: string | null;
}

/** Поле задачи в трекере. `sprint` — задачу добавили в этот спринт или сняли с него. */
export type SprintHistoryIssueField =
  | 'assignee'
  | 'deadline'
  | 'sprint'
  | 'start'
  | 'status'
  | 'storyPoints'
  | 'testPoints';

export interface SprintHistoryIssueEvent {
  actor: SprintHistoryActor;
  /** ISO-время изменения. */
  at: string;
  /** Для поля `sprint` — added / removed, для остальных — changed. */
  change: 'added' | 'changed' | 'removed';
  field: SprintHistoryIssueField;
  from: string | null;
  id: string;
  issueKey: string;
  source: 'tracker';
  to: string | null;
}

export type SprintHistoryBoardObject = 'goal' | 'link' | 'note';

export interface SprintHistoryBoardEvent {
  action: 'create' | 'delete' | 'update';
  actor: SprintHistoryActor;
  at: string;
  /** Что поменялось при update: text, done, day, assigneeId… */
  changedFields: string[];
  /** Цель: отмечена сделанной (после изменения). */
  done: boolean | null;
  id: string;
  /** Концы стрелки (id задач или заметок). */
  linkEnds: { from: string; to: string } | null;
  object: SprintHistoryBoardObject;
  objectId: string;
  /** Текст до изменения, если он менялся. */
  previousText: string | null;
  source: 'board';
  /** Текст заметки или цели (после изменения, у удалённой — последний). */
  text: string | null;
}

export type SprintHistoryEvent = SprintHistoryBoardEvent | SprintHistoryIssueEvent;

export interface SprintHistoryResponse {
  events: SprintHistoryEvent[];
}
