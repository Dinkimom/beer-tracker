import type { SwimlaneAnnotationContextMenuVariant } from '@/features/comments/utils/swimlaneCommentTaskBridge';

export type AnnotationContextMenuAction =
  | 'approve'
  | 'askAgent'
  | 'assignee'
  | 'color'
  | 'convert'
  | 'copy'
  | 'delete'
  | 'edit'
  | 'link'
  | 'moveToSprint'
  | 'parent'
  | 'reject';

/**
 * Какие пункты контекстного меню доступны аннотации каждого вида.
 * Черновик агента (`pending`) — как тулбар на карточке (`resolveTaskBarAnnotationChrome`):
 * только принять или отклонить; править, красить, переносить и связывать его нельзя.
 */
const ANNOTATION_CONTEXT_MENU_ACTIONS: Record<
  SwimlaneAnnotationContextMenuVariant,
  readonly AnnotationContextMenuAction[]
> = {
  diagram: ['edit', 'assignee', 'parent', 'link', 'delete'],
  image: ['assignee', 'parent', 'link', 'delete'],
  note: ['edit', 'convert', 'askAgent', 'copy', 'assignee', 'parent', 'moveToSprint', 'link', 'color', 'delete'],
  pending: ['approve', 'reject'],
  widget: ['assignee', 'parent', 'link', 'delete'],
};

export function resolveAnnotationContextMenuActions(
  variant: SwimlaneAnnotationContextMenuVariant
): ReadonlySet<AnnotationContextMenuAction> {
  return new Set(ANNOTATION_CONTEXT_MENU_ACTIONS[variant]);
}
