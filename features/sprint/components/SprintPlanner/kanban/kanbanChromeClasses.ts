/**
 * Визуальный хром канбана: мягкий жёлоб колонки + нейтральная карточка
 * (референс Яндекс Трекер, адаптированный под glass-планер).
 */

/** Общая sticky-шапка колонки: низ плоский, стыкуется с телом. */
export const KANBAN_COLUMN_HEADER_GLASS =
  'kanban-column-glass rounded-t-xl rounded-b-none border-x border-t border-b-0 border-gray-200 dark:border-white/10';

/** Тело колонки под sticky-шапкой: верх плоский. */
export const KANBAN_COLUMN_GLASS =
  'kanban-column-glass rounded-b-xl rounded-t-none border-x border-b border-t-0 border-gray-200 dark:border-white/10';

export const KANBAN_COLUMN_IDLE = `${KANBAN_COLUMN_GLASS}`;

export const KANBAN_COLUMN_DROP_OK =
  'kanban-column-glass rounded-b-xl rounded-t-none border-x border-b border-t-0 border-blue-400/70 !bg-blue-500/[0.1] dark:border-blue-400/50 dark:!bg-blue-500/15';

export const KANBAN_COLUMN_BODY =
  'flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto p-2 min-h-[120px]';

/**
 * Нейтральная карточка: белая плитка на сером жёлобе.
 * !border-solid — monochrome тянет border-dashed из backlog.sidebar.
 */
export const KANBAN_CARD_SURFACE =
  'pointer-events-none !border-solid !bg-white !border-gray-200 !text-gray-900 shadow-sm dark:!bg-white/[0.08] dark:!border-white/15 dark:!text-gray-100 dark:shadow-none';
export function resolveKanbanColumnChromeClass(
  isOver: boolean,
  isDropDisabled: boolean
): string {
  if (isOver && !isDropDisabled) {
    return KANBAN_COLUMN_DROP_OK;
  }
  return KANBAN_COLUMN_IDLE;
}
