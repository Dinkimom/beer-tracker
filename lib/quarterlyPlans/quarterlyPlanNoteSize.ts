/**
 * Высота заметки квартального плана по тексту (QN2) — как у заметок свимлейна: агент не задаёт высоту,
 * сервер подбирает наименьшую, при которой текст виден целиком. Перенос строк считает та же функция.
 */

import { countWrappedLines, STICKY_NOTE_CHAR_WIDTH_PX, STICKY_NOTE_LINE_HEIGHT_PX } from '@/lib/sprints/sprintPlanPatchNoteSize';

import { QUARTER_NOTE_MAX_ROWS } from './quarterlyPlanLayout';

/*
 * Пиксельная модель листа на доске квартала (`quarterNoteBoxStyle`, `QuarterlyPlanNoteChip`). Сервер не знает
 * экран, поэтому неделя берётся наименьшей ширины доски (`QUARTER_WEEK_MIN_WIDTH_PX`): на широком экране лист
 * выйдет чуть выше нужного, зато текст не обрежется.
 */
const REFERENCE_WEEK_WIDTH_PX = 128;
/** Зазоры листа по краям (2px × 2) и `px-2` × 2. */
const NOTE_HORIZONTAL_CHROME_PX = 20;
/** Дорожка строки; лист в N дорожек — 28·N − 4 px. */
const LANE_HEIGHT_PX = 28;
const NOTE_LANE_GAP_PX = 4;
/** `pt-1` и запас снизу под выносные элементы букв. */
const NOTE_VERTICAL_CHROME_PX = 6;

/**
 * Наименьшая высота заметки в дорожках, при которой текст влезает целиком при ширине в `weeks` недель;
 * не больше `QUARTER_NOTE_MAX_ROWS`. Переводы строк сохраняются, длинные строки переносятся по словам.
 */
export function estimateQuarterNoteRows(text: string, weeks: number): number {
  const textWidthPx = Math.max(STICKY_NOTE_CHAR_WIDTH_PX, weeks * REFERENCE_WEEK_WIDTH_PX - NOTE_HORIZONTAL_CHROME_PX);
  const lines = text
    .split('\n')
    .reduce((sum, line) => sum + countWrappedLines(line, textWidthPx, STICKY_NOTE_CHAR_WIDTH_PX), 0);
  const heightPx = lines * STICKY_NOTE_LINE_HEIGHT_PX + NOTE_VERTICAL_CHROME_PX + NOTE_LANE_GAP_PX;
  return Math.max(1, Math.min(QUARTER_NOTE_MAX_ROWS, Math.ceil(heightPx / LANE_HEIGHT_PX)));
}
