import type { Comment, TaskParent } from '@/types';

/**
 * Действия с заметками на свимлейне одним объектом: собираются в `SprintPlannerView`
 * и без изменений доходят до сегмента карточки (секция → дорожка → слой задач).
 * Добавить действие — сюда, а не в каждый слой.
 */
export interface SwimlaneCommentActions {
  onCommentApprove?: (commentId: string) => void;
  onCommentCardRowLayoutUpdate?: (commentId: string, layout: { layerShiftUp: number; span: number }) => void;
  onCommentCreate?: (comment: Comment) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
}
