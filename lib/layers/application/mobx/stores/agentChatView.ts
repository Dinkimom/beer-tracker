import type { Task } from '@/types';

import { action, makeObservable, observable } from 'mobx';

/**
 * Открытый чат агента и откуда его открыли: задача (меню карточки), заметка (меню заметки),
 * спринт целиком (✨ в тулбаре), новая задача агенту в работу («Сделать в коде» в чате: чат с готовой
 * просьбой, агент стартует по отправке) или сессия — выбранная (`sessionId`: список, тост)
 * или та, что уже в чате.
 */
type AgentRequestTarget =
  | { kind: 'dev'; request: AgentDevRequest }
  | { kind: 'note'; noteId: string; text: string }
  | { kind: 'session'; sessionId?: string }
  | { kind: 'sprint' }
  | { kind: 'task'; task: Task };

/**
 * Задача, которую отдают агенту в работу: из неё — просьба по умолчанию и контекст сессии.
 * Ключ — трекера (у QA-карточки id свой, а агент ищет задачу по ключу).
 */
export interface AgentDevRequest {
  assigneeName?: string;
  sprintName?: string;
  summary: string;
  taskKey: string;
}

/** Задача или заметка, приложенная к следующей реплике агенту (плашка над полем ввода). */
export type AgentChatContextItem = Extract<AgentRequestTarget, { kind: 'note' | 'task' }>;

/** Одна задача или заметка — одна плашка. */
export function agentChatContextKey(item: AgentChatContextItem): string {
  return item.kind === 'task' ? `task:${item.task.id}` : `note:${item.noteId}`;
}

/** Чат агента на доске: открыт ли и откуда, и плашки контекста следующей реплики. */
export class AgentChatView {
  /** Чат агента открыт (не null) и откуда: задача, заметка, спринт или текущая сессия. */
  agentRequestTarget: AgentRequestTarget | null = null;

  /**
   * Плашки контекста следующей реплики агенту: каждое «Попросить агента» с карточки или заметки
   * добавляет свою. Живут до отправки (или смены спринта) — сворачивание чата их не сбрасывает.
   */
  agentChatContext: readonly AgentChatContextItem[] = [];

  constructor() {
    makeObservable(this, {
      agentChatContext: observable.ref,
      agentRequestTarget: observable.ref,
      clearAgentChatContext: action.bound,
      removeAgentChatContext: action.bound,
      reset: action.bound,
      setAgentRequestTarget: action.bound,
    });
  }

  setAgentRequestTarget(target: AgentRequestTarget | null): void {
    this.agentRequestTarget = target;
    if (target?.kind !== 'task' && target?.kind !== 'note') {
      return;
    }
    const key = agentChatContextKey(target);
    if (!this.agentChatContext.some((item) => agentChatContextKey(item) === key)) {
      this.agentChatContext = [...this.agentChatContext, target];
    }
  }

  removeAgentChatContext(key: string): void {
    this.agentChatContext = this.agentChatContext.filter((item) => agentChatContextKey(item) !== key);
  }

  clearAgentChatContext(): void {
    this.agentChatContext = [];
  }

  /** Смена спринта: чат закрывается, плашки прошлой доски не переносятся. */
  reset(): void {
    this.agentRequestTarget = null;
    this.agentChatContext = [];
  }
}
