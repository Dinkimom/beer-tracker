import type { SprintContextNote } from '@/lib/sprints/sprintContextTypes';
import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import {
  MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT,
  plannerCommentDurationPartsFromWidth,
} from '@/lib/comments/plannerCommentCardRow';
import { stickyNoteUsesMarkdownLayout } from '@/lib/markdown/markdownChecklist';

/** Legacy px width: 200 → 2 части таймлайна, как короткая задача. */
const DEFAULT_PLAN_PATCH_NOTE_WIDTH = 200;

const DEFAULT_PARTS_PER_DAY = 3;

/*
 * Пиксельная модель заметки на свимлейне. Сервер не знает экран, поэтому день берём
 * эталонным: экран ~1728px минус колонка участников (272) на 10 дней.
 * Шире экран — заметка чуть выше нужного, уже — текст упрётся в clamp.
 */
const REFERENCE_DAY_WIDTH_PX = 144;
/** CARD_MARGIN × 2 + `!px-4` × 2 + рамка 1px × 2. */
const CARD_HORIZONTAL_CHROME_PX = 58;
/** Карточка в один ряд: 82px строки минус SWIMLANE_TASK_ROW_VERTICAL_INSET_PX × 2. */
const ONE_ROW_CARD_HEIGHT_PX = 58;
/** SWIMLANE_STACKED_LAYER_GAP_PX: каждый следующий ряд добавляет карточку и зазор. */
const ROW_STEP_PX = ONE_ROW_CARD_HEIGHT_PX + 8;
/** `!pt-2` + `!pb-1.5` + рамка 1px × 2. */
const CARD_VERTICAL_CHROME_PX = 16;

/** Средняя ширина символа Excalifont 12px (латиница ~6.0, кириллица ~6.3) с запасом на перенос. */
const CHAR_WIDTH_PX = 6.4;
/** Обычный текст: `text-xs leading-snug`, по центру, `\n` схлопывается в пробел. */
const PLAIN_LINE_HEIGHT_PX = 16.5;

/** Markdown-раскладка (`MarkdownChecklistPreview`, variant card): `text-xs leading-normal`. */
const MARKDOWN_LINE_HEIGHT_PX = 18;
/** `py-0.5` у пункта/абзаца. */
const MARKDOWN_ITEM_PADDING_PX = 4;
/** `h-1.5` у пустой строки. */
const MARKDOWN_EMPTY_LINE_PX = 6;
/** `px-0.5` / `pt-0.5` контейнера markdown. */
const MARKDOWN_CONTAINER_X_PX = 4;
const MARKDOWN_CONTAINER_TOP_PX = 2;
/** Чекбокс 14px + gap 6px. */
const MARKDOWN_CHECKBOX_INDENT_PX = 20;
/** `pl-0.5` + «•» + gap 6px. */
const MARKDOWN_BULLET_INDENT_PX = 13;

const MARKDOWN_HEADINGS: Record<number, { blockPx: number; charPx: number; linePx: number }> = {
  1: { blockPx: 8, charPx: (CHAR_WIDTH_PX * 16) / 12, linePx: 20 },
  2: { blockPx: 8, charPx: (CHAR_WIDTH_PX * 14) / 12, linePx: 19.25 },
  3: { blockPx: 6, charPx: CHAR_WIDTH_PX, linePx: MARKDOWN_LINE_HEIGHT_PX },
};

const CHECKBOX_LINE = /^\s*(?:[-*+]\s+|\d+\.\s+)?\[[ xX]\]\s?/;
const BULLET_LINE = /^\s*[-*+]\s+/;
const HEADING_LINE = /^(#{1,3}) /;
const INLINE_MARKERS = /\*\*|~~|[*`]/g;

/** Строк текста при жадном переносе по словам; слово длиннее строки рвётся (`break-words`). */
function countWrappedLines(text: string, widthPx: number, charPx: number): number {
  const charsPerLine = Math.max(1, Math.floor(widthPx / charPx));
  const words = text.replaceAll(INLINE_MARKERS, '').split(/\s+/).filter(Boolean);
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const needed = used === 0 ? word.length : used + 1 + word.length;
    if (needed <= charsPerLine) {
      used = needed;
      continue;
    }
    if (used > 0) {
      lines += 1;
    }
    lines += Math.ceil(word.length / charsPerLine) - 1;
    used = word.length % charsPerLine || charsPerLine;
  }
  return lines;
}

function markdownLineHeightPx(line: string, widthPx: number): number {
  if (!line.trim()) {
    return MARKDOWN_EMPTY_LINE_PX;
  }
  const heading = HEADING_LINE.exec(line);
  if (heading) {
    const style = MARKDOWN_HEADINGS[heading[1]!.length]!;
    return style.blockPx + style.linePx * countWrappedLines(line.slice(heading[0].length), widthPx, style.charPx);
  }
  const item = markdownListItem(line);
  return (
    MARKDOWN_ITEM_PADDING_PX +
    MARKDOWN_LINE_HEIGHT_PX * countWrappedLines(item.body, widthPx - item.indentPx, CHAR_WIDTH_PX)
  );
}

function markdownListItem(line: string): { body: string; indentPx: number } {
  const checkbox = CHECKBOX_LINE.exec(line);
  if (checkbox) {
    return { body: line.slice(checkbox[0].length), indentPx: MARKDOWN_CHECKBOX_INDENT_PX };
  }
  const bullet = BULLET_LINE.exec(line);
  if (bullet) {
    return { body: line.slice(bullet[0].length), indentPx: MARKDOWN_BULLET_INDENT_PX };
  }
  return { body: line, indentPx: 0 };
}

function noteContentHeightPx(text: string, textWidthPx: number): number {
  if (!stickyNoteUsesMarkdownLayout(text)) {
    return PLAIN_LINE_HEIGHT_PX * countWrappedLines(text, textWidthPx, CHAR_WIDTH_PX);
  }
  const widthPx = textWidthPx - MARKDOWN_CONTAINER_X_PX;
  return text
    .split('\n')
    .reduce((sum, line) => sum + markdownLineHeightPx(line, widthPx), MARKDOWN_CONTAINER_TOP_PX);
}

/**
 * Минимальная высота заметки в рядах свимлейна, при которой текст влезает целиком.
 * Карточка в N рядов: 66·N − 8 px, под текст 66·N − 24 px; ширина под текст —
 * parts / partsPerDay · 144 − 58 px (эталонный экран).
 */
export function estimatePlanPatchNoteCardRows(
  text: string,
  width: number,
  partsPerDay: number = DEFAULT_PARTS_PER_DAY
): number {
  const durationParts = plannerCommentDurationPartsFromWidth(width);
  const textWidthPx = Math.max(
    CHAR_WIDTH_PX,
    (durationParts / partsPerDay) * REFERENCE_DAY_WIDTH_PX - CARD_HORIZONTAL_CHROME_PX
  );
  const contentPx = noteContentHeightPx(text, textWidthPx);
  const rows = Math.ceil((contentPx + CARD_VERTICAL_CHROME_PX + ROW_STEP_PX - ONE_ROW_CARD_HEIGHT_PX) / ROW_STEP_PX);
  return Math.max(1, Math.min(MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT, rows));
}

export function resolvePlanPatchCreateNoteSize(input: {
  height?: number;
  partsPerDay?: number;
  text: string;
  width?: number;
}): { height: number; width: number } {
  const width = input.width ?? DEFAULT_PLAN_PATCH_NOTE_WIDTH;
  return {
    height: input.height ?? estimatePlanPatchNoteCardRows(input.text, width, input.partsPerDay),
    width,
  };
}

/**
 * Проставляет высоту по тексту заметкам без явного `height`: createNote всегда,
 * updateNote — если меняется текст или ширина текстовой заметки.
 */
export function fitPlanPatchNoteHeights(
  ops: SprintPlanPatchOp[],
  notes: readonly SprintContextNote[],
  partsPerDay: number
): SprintPlanPatchOp[] {
  const notesById = new Map(notes.map((note) => [note.id, note]));
  return ops.map((op) => {
    if (op.op === 'createNote' && op.height === undefined) {
      return { ...op, height: resolvePlanPatchCreateNoteSize({ ...op, partsPerDay }).height };
    }
    if (op.op !== 'updateNote' || op.height !== undefined || (op.text === undefined && op.width === undefined)) {
      return op;
    }
    const note = notesById.get(op.commentId);
    if (!note || note.kind !== 'text') {
      return op;
    }
    return {
      ...op,
      height: estimatePlanPatchNoteCardRows(op.text ?? note.text, op.width ?? note.width, partsPerDay),
    };
  });
}
