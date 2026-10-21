import type { Comment, Task } from '@/types';

import { action, makeObservable, observable } from 'mobx';

interface SprintMovePlacementSessionBase {
  /** Связи в исходном спринте: снимаются после переноса. */
  sourceLinkIds: string[];
  sourceSprintId: number;
  targetSprintId: number;
  targetSprintName: string;
}

interface SprintMovePlacementCommentSession extends SprintMovePlacementSessionBase {
  /** Заметка как была в исходном спринте: для отмены. */
  comment: Comment;
  kind: 'comment';
}

interface SprintMovePlacementTaskSession extends SprintMovePlacementSessionBase {
  kind: 'task';
  /** Длительность карточки в исходном спринте, если она стояла в плане. */
  sourcePositionDuration: number | null;
  task: Task;
}

/**
 * Перенос в другой спринт с выбором места на его доске.
 * Задача до подтверждения остаётся в старом спринте, заметка переезжает сразу и при отмене возвращается.
 */
export type SprintMovePlacementSession =
  | SprintMovePlacementCommentSession
  | SprintMovePlacementTaskSession;

/**
 * Сессия режима «Запланировать в другом спринте».
 * Живёт между сменами спринта: планер открывает целевой спринт, показывает там задачу или заметку
 * и после подтверждения или отмены возвращает в исходный.
 */
export class SprintMovePlacementStore {
  session: SprintMovePlacementSession | null = null;

  /** Целевой спринт открыт и карточка стоит на доске. */
  staged = false;

  saving = false;

  constructor() {
    makeObservable(this, {
      finish: action.bound,
      markStaged: action.bound,
      saving: observable,
      session: observable.ref,
      setSaving: action.bound,
      staged: observable,
      start: action.bound,
    });
  }

  start(session: SprintMovePlacementSession): void {
    this.session = session;
    this.staged = false;
    this.saving = false;
  }

  markStaged(): void {
    this.staged = true;
  }

  setSaving(saving: boolean): void {
    this.saving = saving;
  }

  finish(): void {
    this.session = null;
    this.staged = false;
    this.saving = false;
  }
}
