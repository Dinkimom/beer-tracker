/**
 * Единая схема hover-эффектов доски свимлейна.
 *
 * Появление — после hover-intent: курсор, который просто проходит по доске, ничего не зажигает.
 * Скрытие — быстрое и без задержки, чтобы за курсором не тянулся шлейф из гаснущих эффектов.
 * Прямой отклик элемента под курсором (тень карточки, цвет кнопки) — без intent, 0.2s.
 *
 * Те же тайминги у рукояток ресайза карточки (`.task-bar-resize-handle-visual` в globals.css).
 */

/** Задержка перед общими эффектами hover: «+» в ячейке, кластер связей, вторичные контролы. */
export const SWIMLANE_HOVER_INTENT_MS = 150;

/** Задержка снятия hover карточки: переход на соседнюю не мигает затемнением всей доски. */
export const SWIMLANE_HOVER_RELEASE_MS = 80;

/** Вторичные контролы, раскрываемые hover'ом `group` (действия шапки строки, пин, рукоятка высоты). */
export const SWIMLANE_GROUP_HOVER_REVEAL_CLASS =
  'opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-hover:delay-150 group-hover:duration-200';
