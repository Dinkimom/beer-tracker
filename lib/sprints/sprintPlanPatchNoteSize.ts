import {
  MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT,
  plannerCommentDurationPartsFromWidth,
} from '@/lib/comments/plannerCommentCardRow';

/** Legacy px width: 200 → 2 части таймлайна, как короткая задача. */
const DEFAULT_PLAN_PATCH_NOTE_WIDTH = 200;

/** Высота карточки задачи в строках свимлейна. */
const TASK_CARD_ROW_SPAN = 1;

/**
 * Сколько строк `text-xs` / leading-snug влезает в карточку высоты задачи.
 * Совпадает с fallback clamp заголовка обычной карточки.
 */
const LINES_PER_TASK_CARD_ROW = 3;

/**
 * Рукописный `text-xs` широкий; после padding на одну часть таймлайна ~10 символов.
 * Лучше чуть завысить высоту, чем обрезать текст.
 */
const CHARS_PER_DURATION_PART = 10;

function countWrappedTextLines(text: string, charsPerLine: number): number {
  const paragraphs = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  let lines = 0;
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines += 1;
      continue;
    }
    lines += Math.ceil(paragraph.length / charsPerLine);
  }
  return Math.max(1, lines);
}

/** Высота в строках карточки: 1 как у задачи, больше если текст не влезает по ширине. */
export function estimatePlanPatchNoteCardRows(text: string, width: number): number {
  const durationParts = plannerCommentDurationPartsFromWidth(width);
  const charsPerLine = Math.max(8, durationParts * CHARS_PER_DURATION_PART);
  const rows = Math.ceil(countWrappedTextLines(text, charsPerLine) / LINES_PER_TASK_CARD_ROW);
  return Math.max(TASK_CARD_ROW_SPAN, Math.min(MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT, rows));
}

export function resolvePlanPatchCreateNoteSize(input: {
  height?: number;
  text: string;
  width?: number;
}): { height: number; width: number } {
  const width = input.width ?? DEFAULT_PLAN_PATCH_NOTE_WIDTH;
  return {
    height: input.height ?? estimatePlanPatchNoteCardRows(input.text, width),
    width,
  };
}
