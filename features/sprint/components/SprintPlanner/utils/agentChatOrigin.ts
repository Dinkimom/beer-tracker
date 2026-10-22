import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentSessionContext } from '@/lib/agentSessions/agentSession';
import type { AgentChatContextItem } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { formatStickyNoteTextForPreview } from '@/lib/comments/stickyNoteMentions';
import { agentChatContextKey } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

/** Плашка контекста над полем ввода: что уйдёт агенту упоминанием и ключ, по которому её снимают. */
interface AgentChatContextChip {
  key: string;
  mention: AgentMention;
}

/** Контекст следующей реплики и данные новой сессии, если её ещё нет. */
export interface AgentSessionChatOrigin {
  chips?: AgentChatContextChip[];
  context?: AgentSessionContext;
  taskId?: string;
}

function chipOf(item: AgentChatContextItem): AgentChatContextChip {
  const key = agentChatContextKey(item);
  if (item.kind === 'task') {
    // Ключ трекера, не id карточки: у QA-карточки id свой, а агент ищет задачу по ключу.
    const taskKey = getTaskTrackerDisplayKey(item.task);
    return { key, mention: { id: taskKey, kind: 'task', label: taskKey } };
  }
  const label = formatStickyNoteTextForPreview(item.text, 60) || '…';
  return { key, mention: { id: item.noteId, kind: 'note', label } };
}

/**
 * Плашки, приложенные к следующей реплике (задачи и заметки, с которых звали агента).
 * Новая сессия привязывается к задаче, только если она одна: так её видно во входящих агента.
 */
export function resolveAgentChatOrigin(
  items: readonly AgentChatContextItem[],
  sprintName: string | undefined
): AgentSessionChatOrigin {
  const tasks = items.filter((item) => item.kind === 'task');
  const only = tasks.length === 1 ? tasks[0] : undefined;
  if (!only) {
    return { chips: items.map(chipOf), context: { sprintName } };
  }
  const taskKey = getTaskTrackerDisplayKey(only.task);
  return {
    chips: items.map(chipOf),
    context: { assigneeName: only.task.assigneeName, sprintName, summary: only.task.name, taskKey },
    taskId: taskKey,
  };
}
