import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentSessionContext } from '@/lib/agentSessions/agentSession';
import type { AgentRequestTarget } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { formatStickyNoteTextForPreview } from '@/lib/comments/stickyNoteMentions';

/** С чем создать сессию, если её ещё нет: задача / заметка / спринт, откуда открыли чат. */
export interface AgentSessionChatOrigin {
  context?: AgentSessionContext;
  /** Неснимаемые плашки контекста над полем ввода; уходят агенту упоминаниями. */
  mentions?: AgentMention[];
  taskId?: string;
}

/**
 * Откуда открыли чат агента: плашка контекста, данные для новой сессии и ключ,
 * по которому чат сбрасывает черновик при смене цели.
 */
export function resolveAgentChatOrigin(
  target: AgentRequestTarget,
  sprintName: string | undefined
): { key: string; origin: AgentSessionChatOrigin } {
  if (target.kind === 'task') {
    const key = getTaskTrackerDisplayKey(target.task);
    return {
      key: `task:${target.task.id}`,
      origin: {
        context: { assigneeName: target.task.assigneeName, sprintName, summary: target.task.name, taskKey: key },
        mentions: [{ id: target.task.id, kind: 'task', label: key }],
        taskId: target.task.id,
      },
    };
  }
  if (target.kind === 'note') {
    const label = formatStickyNoteTextForPreview(target.text, 60) || '…';
    return {
      key: `note:${target.noteId}`,
      origin: { context: { sprintName }, mentions: [{ id: target.noteId, kind: 'note', label }] },
    };
  }
  return { key: target.kind, origin: { context: { sprintName } } };
}
