/**
 * Палитра и форма sticky-note для заметки на свимлейне (localDraftKind: 'comment').
 * Заливка задаётся inline-стилями в getStickyNoteCardStyle — Tailwind JIT не обязан
 * знать все bg-*-200 заранее.
 */

const STICKY_NOTE_FONT_CLASS = 'font-excalifont';

/** Форма: прямые углы, без 3D-наклона; в покое без тени (hover-акцент — через TaskCard). */
const STICKY_NOTE_SHAPE_CLASS = '!rounded-none shadow-none';

const STICKY_NOTE_PADDING_CLASS = '!px-4 !pb-1.5 !pt-2';

/** Fill + text + форма для заметки на свимлейне. */
export function getStickyNoteLocalDraftSurfaceClasses(): string {
  return `${STICKY_NOTE_FONT_CLASS} ${STICKY_NOTE_SHAPE_CLASS} ${STICKY_NOTE_PADDING_CLASS}`;
}

/**
 * Border-классы для TaskCard: ширину и цвет бордера задаёт inline-стиль,
 * чтобы `border-0` / `!border` не перебивали заливку.
 */
export function getStickyNoteLocalDraftBorderClasses(): string {
  return '';
}

/** Классы для placeholder-текста на пустой заметке. Цвет наследуется с карточки. */
export function getStickyNotePlaceholderTextClass(): string {
  return `${STICKY_NOTE_FONT_CLASS} font-normal opacity-50`;
}

/** Прописной шрифт для текста заметки (read-only и textarea). */
export function getStickyNoteTextClass(): string {
  return `${STICKY_NOTE_FONT_CLASS} font-normal`;
}

/** Вертикальные отступы текста внутри заметки (без my-1 у обычных карточек). */
export function getStickyNoteContentSpacingClass(): string {
  return 'my-0';
}

/** Контейнер plain-текста заметки: по центру по обеим осям. */
export function getStickyNoteContentLayoutClass(): string {
  return 'flex h-full w-full min-h-0 items-center justify-center text-center';
}

/** Контейнер markdown-тела заметки: сверху слева, скролл, отступ от рукояток ресайза. */
export function getStickyNoteMarkdownLayoutClass(): string {
  return 'pointer-events-auto flex h-full w-full min-h-0 flex-col justify-start overflow-y-auto px-0.5 pt-0.5 text-left';
}

/** Размер текста заметки: одинаковый при любой ширине карточки. */
export function resolveStickyNoteDisplayModes(): {
  lineHeightClass: string;
  textSize: string;
} {
  return {
    lineHeightClass: 'leading-snug',
    textSize: 'text-xs',
  };
}

const STICKY_NOTE_DELETE_BASE_CLASS =
  'pointer-events-auto absolute -right-1 -top-1 opacity-0 !h-4 !w-4 !min-h-0 !min-w-0 !justify-center !gap-0 !rounded-full !border !p-0 !shadow-sm transition-opacity transition-colors duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:!border-red-500 hover:!bg-red-100 hover:!text-red-700 focus-visible:!ring-1 focus-visible:!ring-red-400 dark:hover:!border-red-500 dark:hover:!bg-red-950/80 dark:hover:!text-red-200';

export function getStickyNoteDeleteButtonClasses(): string {
  return STICKY_NOTE_DELETE_BASE_CLASS;
}
