import { action, makeObservable, observable } from 'mobx';
import { v4 as uuid } from 'uuid';

import { AgentChatView } from './agentChatView';
import { AnnotationToolsView } from './annotationToolsView';
import { PlannerFocusView } from './plannerFocusView';
import { PlannerOverlaysView } from './plannerOverlaysView';
import { SwimlaneCardsView } from './swimlaneCardsView';

/**
 * Преходящий UI планера спринта — классы под вью по областям. Стор их только держит и сбрасывает
 * при смене спринта; читать и менять состояние — через область (`sprintPlannerUi.cards.…`).
 */
export class SprintPlannerUiStore {
  /** Идентификатор «сессии» планера на клиенте (отладка, e2e). */
  sessionId = uuid();

  /** Карточки на доске: наведение, перетаскивание, ресайз и превью раскладки. */
  readonly cards = new SwimlaneCardsView();

  /** Что открыто поверх доски: сайдбар, контекстное меню, панель задачи, учёт работ. */
  readonly overlays = new PlannerOverlaysView();

  /** Инструменты доски и режимы правки карточки (заметки, схемы, фото, связи, отрезки). */
  readonly tools = new AnnotationToolsView(this.overlays);

  /** Чат агента и плашки контекста. */
  readonly agentChat = new AgentChatView();

  /** Подсветка карточек и поиск по имени. */
  readonly focus = new PlannerFocusView();

  constructor() {
    makeObservable(this, {
      clearTransientUiOnSprintChange: action.bound,
      resetSession: action,
      sessionId: observable,
    });
  }

  resetSession(): void {
    this.sessionId = uuid();
  }

  /** Сброс преходящего UI при смене спринта; сайдбар, цвет и буфер заметки остаются. */
  clearTransientUiOnSprintChange(): void {
    this.cards.reset();
    this.overlays.reset();
    this.tools.reset();
    this.agentChat.reset();
    this.focus.reset();
  }
}
