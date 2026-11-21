import type {
  SprintPlannerOccupancyPresencePreview,
  SprintPlannerTaskResizePreview,
} from '../sprintPlannerUiTypes';

import { action, makeObservable, observable } from 'mobx';

interface CardRowLayout {
  layerShiftUp: number;
  span: number;
}

/**
 * Карточки на доске прямо сейчас: наведение, перетаскивание и ресайз (presence и подсветка),
 * превью раскладки до отпускания мыши и счётчики скрытых связей. Живёт, пока открыт спринт.
 */
export class SwimlaneCardsView {
  /** Подсветка связей / затемнение при hover по карточке. */
  hoveredTaskId: string | null = null;

  /** Связи, скрытые в покое (режим «Важные» / «При наведении»): счётчик в правой рейке карточки. */
  hiddenLinkCountByTaskId = new Map<string, number>();

  /** Drag вне dnd-kit свимлейна (канбан) — presence «изменяет». */
  boardDraggingTaskId: string | null = null;

  /** Превью бара занятости из чужих вкладок (старый планер; локально не пишется). */
  occupancyPresencePreview: SprintPlannerOccupancyPresencePreview | null = null;

  /** Удержание рукояток длительности карточки на свимлейне (presence как при drag). */
  resizingTaskId: string | null = null;

  /**
   * Локальный вертикальный размер sticky-note в строках карточек (без API).
   * Ключ — taskId (`comment:*` или local draft).
   */
  stickyNoteCardRowOverrides = new Map<string, CardRowLayout>();

  /** Превью ресайза по строкам карточек до mouseup. */
  stickyNoteCardRowPreview: (CardRowLayout & { taskId: string }) | null = null;

  /** Превью ширины/старта карточки до mouseup — слои пересчитываются сразу. */
  taskResizePreview: SprintPlannerTaskResizePreview | null = null;

  /**
   * Растёт при отмене ресайза (Escape). Layout сбрасывает latch ширины,
   * не дожидаясь, пока сохранённая позиция догонит превью.
   */
  localTaskResizeDiscardEpoch = 0;

  /** Ревизия превью/override карточек: useSyncExternalStore в layout, минуя memo свимлейна. */
  cardLayoutRevision = 0;

  constructor() {
    makeObservable<SwimlaneCardsView, 'bumpCardLayoutRevision'>(this, {
      boardDraggingTaskId: observable,
      bumpCardLayoutRevision: action,
      cardLayoutRevision: observable,
      clearStickyNoteCardRowOverride: action.bound,
      clearStickyNoteCardRowPreview: action.bound,
      clearTaskResizePreview: action.bound,
      commitStickyNoteCardRowLayout: action.bound,
      discardLocalTaskResizePreview: action.bound,
      hiddenLinkCountByTaskId: observable,
      hoveredTaskId: observable,
      localTaskResizeDiscardEpoch: observable,
      occupancyPresencePreview: observable,
      reset: action.bound,
      resizingTaskId: observable,
      setBoardDraggingTaskId: action.bound,
      setHiddenLinkCounts: action.bound,
      setHoveredTaskId: action.bound,
      setResizingTaskId: action.bound,
      setStickyNoteCardRowOverride: action.bound,
      setStickyNoteCardRowPreview: action.bound,
      setTaskResizePreview: action.bound,
      stickyNoteCardRowOverrides: observable,
      stickyNoteCardRowPreview: observable,
      taskResizePreview: observable,
    });
  }

  /** Точечно: карточки перерисовываются только там, где счётчик поменялся. */
  setHiddenLinkCounts(counts: ReadonlyMap<string, number>): void {
    for (const taskId of [...this.hiddenLinkCountByTaskId.keys()]) {
      if (!counts.has(taskId)) this.hiddenLinkCountByTaskId.delete(taskId);
    }
    for (const [taskId, count] of counts) {
      if (this.hiddenLinkCountByTaskId.get(taskId) !== count) {
        this.hiddenLinkCountByTaskId.set(taskId, count);
      }
    }
  }

  setHoveredTaskId(id: string | null): void {
    this.hoveredTaskId = id;
  }

  setBoardDraggingTaskId(id: string | null): void {
    this.boardDraggingTaskId = id;
  }

  setResizingTaskId(id: string | null): void {
    this.resizingTaskId = id;
  }

  getStickyNoteCardRowOverride(taskId: string): CardRowLayout | undefined {
    return this.stickyNoteCardRowOverrides.get(taskId);
  }

  setStickyNoteCardRowOverride(taskId: string, layout: CardRowLayout): void {
    this.stickyNoteCardRowOverrides.set(taskId, layout);
    this.bumpCardLayoutRevision();
  }

  clearStickyNoteCardRowOverride(taskId: string): void {
    if (!this.stickyNoteCardRowOverrides.delete(taskId)) {
      return;
    }
    this.bumpCardLayoutRevision();
  }

  setStickyNoteCardRowPreview(preview: (CardRowLayout & { taskId: string }) | null): void {
    const current = this.stickyNoteCardRowPreview;
    if (
      current?.taskId === preview?.taskId &&
      current?.span === preview?.span &&
      current?.layerShiftUp === preview?.layerShiftUp
    ) {
      return;
    }
    this.stickyNoteCardRowPreview = preview;
    this.bumpCardLayoutRevision();
  }

  clearStickyNoteCardRowPreview(): void {
    if (this.stickyNoteCardRowPreview == null) {
      return;
    }
    this.stickyNoteCardRowPreview = null;
    this.bumpCardLayoutRevision();
  }

  /** Override и сброс preview в одном revision — иначе кадр со старой высотой. */
  commitStickyNoteCardRowLayout(taskId: string, layout: CardRowLayout): void {
    this.stickyNoteCardRowOverrides.set(taskId, layout);
    if (this.stickyNoteCardRowPreview?.taskId === taskId) {
      this.stickyNoteCardRowPreview = null;
    }
    this.bumpCardLayoutRevision();
  }

  setTaskResizePreview(preview: SprintPlannerTaskResizePreview | null): void {
    const current = this.taskResizePreview;
    if (
      current?.taskId === preview?.taskId &&
      current?.duration === preview?.duration &&
      current?.startCell === preview?.startCell &&
      current?.planSegmentIndex === preview?.planSegmentIndex
    ) {
      return;
    }
    this.taskResizePreview = preview;
    this.bumpCardLayoutRevision();
  }

  clearTaskResizePreview(): void {
    if (this.taskResizePreview == null) {
      return;
    }
    this.taskResizePreview = null;
    this.bumpCardLayoutRevision();
  }

  /** Escape: убрать превью и не удерживать последний размер в layout. */
  discardLocalTaskResizePreview(): void {
    this.taskResizePreview = null;
    this.localTaskResizeDiscardEpoch += 1;
    this.bumpCardLayoutRevision();
  }

  /** Смена спринта: жесты и превью прошлой доски не переживают её. */
  reset(): void {
    this.hoveredTaskId = null;
    this.boardDraggingTaskId = null;
    this.occupancyPresencePreview = null;
    this.resizingTaskId = null;
    this.stickyNoteCardRowOverrides = new Map();
    this.stickyNoteCardRowPreview = null;
    this.taskResizePreview = null;
    this.localTaskResizeDiscardEpoch += 1;
    this.bumpCardLayoutRevision();
  }

  private bumpCardLayoutRevision(): void {
    this.cardLayoutRevision += 1;
  }
}
