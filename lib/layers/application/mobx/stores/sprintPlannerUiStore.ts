import type {
  SprintPlannerContextMenuState,
  SprintPlannerNoteComposerState,
  SprintPlannerNoteEditPreview,
  SprintPlannerOccupancyPresencePreview,
  SprintPlannerTaskResizePreview,
  SwimlaneNoteClipboard,
  SwimlanePlacementTool,
} from '../sprintPlannerUiTypes';
import type { Task } from '@/types';

import { action, makeObservable, observable } from 'mobx';
import { v4 as uuid } from 'uuid';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { getFromStorage, saveToStorage } from '@/hooks/localStorage/storagePrimitives';
import {
  DEFAULT_STICKY_NOTE_COLOR,
  parseStickyNoteColor,
  type StickyNoteColor,
} from '@/lib/comments/stickyNoteColor';

/**
 * UI-состояние планера спринта (MobX).
 * Сюда по мере рефакторинга переносим флаги из useState/пропсов.
 */
export class SprintPlannerUiStore {
  /** Идентификатор «сессии» планера на клиенте (отладка, будущие подписки). */
  sessionId = uuid();

  /** Открыт ли сайдбар планера (persist в localStorage). */
  sidebarOpen = true;

  /** Подсветка связей / затемнение при hover по карточке. */
  hoveredTaskId: string | null = null;

  /** Drag вне dnd-kit свимлейна (канбан, occupancy) — presence «изменяет». */
  boardDraggingTaskId: string | null = null;

  /** Живое превью бара занятости для чужих вкладок. */
  occupancyPresencePreview: SprintPlannerOccupancyPresencePreview | null = null;

  /** Удержание рукояток длительности карточки на свимлейне (presence как при drag). */
  resizingTaskId: string | null = null;

  /**
   * Локальный вертикальный размер sticky-note в строках карточек (прототип, без API).
   * Ключ — taskId (`comment:*` или local draft).
   */
  stickyNoteCardRowOverrides: Map<string, { layerShiftUp: number; span: number }> = new Map();

  /** Превью ресайза по строкам карточек до mouseup. */
  stickyNoteCardRowPreview: { layerShiftUp: number; span: number; taskId: string } | null = null;

  /** Превью ширины/старта карточки до mouseup — слои пересчитываются сразу. */
  taskResizePreview: SprintPlannerTaskResizePreview | null = null;

  /** Ревизия превью/override карточек: useSyncExternalStore в layout, минуя memo свимлейна. */
  cardLayoutRevision = 0;

  /** Контекстное меню по задаче (позиция + задача). */
  contextMenu: SprintPlannerContextMenuState | null = null;

  /** Какая задача открыла контекстное меню (обводка карточки). */
  contextMenuTaskId: string | null = null;

  /** Попап редактирования заметки / конвертации в задачу. */
  noteComposer: SprintPlannerNoteComposerState | null = null;

  /** Полноэкранный редактор схемы Excalidraw (`comment:id`). */
  diagramEditorTaskId: string | null = null;

  /** Полноэкранный просмотр фотокарточки на свимлейне. */
  photoLightboxTaskId: string | null = null;

  /** Предпросмотр текста и цвета стикера до сохранения. */
  noteEditPreview: SprintPlannerNoteEditPreview | null = null;

  /** Скопированная заметка для вставки через «+» на ячейке. */
  noteClipboard: SwimlaneNoteClipboard | null = null;

  /** Инструмент капсулы: чем плюс занимается в ячейке. */
  placementTool: SwimlanePlacementTool = 'cursor';

  /** Последний цвет стикера для инструмента «Заметка» (persist). */
  stickyNoteColor: StickyNoteColor = DEFAULT_STICKY_NOTE_COLOR;

  /** Модалка «учёт работ» по задаче. */
  accountWorkModal: Task | null = null;

  /** Правый сайдер с информацией о задаче (контекстное меню → «Информация о задаче»). */
  taskInfoPanelTask: Task | null = null;

  /** Редактирование сегментов фазы на свимлейне / в занятости. */
  segmentEditTaskId: string | null = null;

  /** Режим создания связи (стрелки) на свимлейне: id задачи-источника. */
  linkingFromTaskId: string | null = null;

  /** Фокус редактирования комментария в таймлайне занятости. */
  openCommentEditId: string | null = null;

  /** Глобальный фильтр по имени/ключу в планере. */
  globalNameFilter = '';

  /** Подсветка карточки после перехода из уведомления. */
  notificationFocusTaskId: string | null = null;

  constructor() {
    this.sidebarOpen = getFromStorage(STORAGE_KEYS.SIDEBAR_OPEN, true);
    this.stickyNoteColor = parseStickyNoteColor(
      getFromStorage(STORAGE_KEYS.SWIMLANE_STICKY_NOTE_COLOR, DEFAULT_STICKY_NOTE_COLOR)
    );
    makeObservable(this, {
      accountWorkModal: observable,
      clearNoteEditPreview: action.bound,
      cardLayoutRevision: observable,
      clearStickyNoteCardRowOverride: action.bound,
      clearStickyNoteCardRowPreview: action.bound,
      commitStickyNoteCardRowLayout: action.bound,
      clearTaskResizePreview: action.bound,
      clearTransientUiOnSprintChange: action.bound,
      closeContextMenu: action.bound,
      closeDiagramEditor: action.bound,
      closePhotoLightbox: action.bound,
      closeNoteComposer: action.bound,
      closeTaskInfoPanel: action.bound,
      contextMenu: observable,
      contextMenuTaskId: observable,
      diagramEditorTaskId: observable,
      globalNameFilter: observable,
      boardDraggingTaskId: observable,
      occupancyPresencePreview: observable,
      hoveredTaskId: observable,
      linkingFromTaskId: observable,
      clearNotificationFocusTaskId: action.bound,
      notificationFocusTaskId: observable,
      resizingTaskId: observable,
      noteClipboard: observable,
      noteEditPreview: observable,
      placementTool: observable,
      noteComposer: observable,
      setNoteClipboard: action.bound,
      setPlacementTool: action.bound,
      openCommentEditId: observable,
      openDiagramEditor: action.bound,
      openPhotoLightbox: action.bound,
      openNoteComposer: action.bound,
      photoLightboxTaskId: observable,
      openTaskInfoPanel: action.bound,
      patchTaskInfoPanelTask: action.bound,
      resetSession: action,
      segmentEditTaskId: observable,
      sessionId: observable,
      setAccountWorkModal: action.bound,
      setContextMenu: action.bound,
      setContextMenuTaskId: action.bound,
      setGlobalNameFilter: action.bound,
      setBoardDraggingTaskId: action.bound,
      setOccupancyPresencePreview: action.bound,
      setHoveredTaskId: action.bound,
      setLinkingFromTaskId: action.bound,
      setNoteEditPreview: action.bound,
      setNotificationFocusTaskId: action.bound,
      setOpenCommentEditId: action.bound,
      setResizingTaskId: action.bound,
      setStickyNoteCardRowOverride: action.bound,
      setStickyNoteCardRowPreview: action.bound,
      setStickyNoteColor: action.bound,
      setTaskResizePreview: action.bound,
      setSegmentEditTaskId: action.bound,
      stickyNoteCardRowOverrides: observable,
      stickyNoteCardRowPreview: observable,
      taskResizePreview: observable,
      setSidebarOpen: action.bound,
      sidebarOpen: observable,
      stickyNoteColor: observable,
      taskInfoPanelTask: observable,
    });
  }

  setSidebarOpen(open: boolean | ((prev: boolean) => boolean)): void {
    const next = typeof open === 'function' ? open(this.sidebarOpen) : open;
    this.sidebarOpen = next;
    saveToStorage(STORAGE_KEYS.SIDEBAR_OPEN, next);
  }

  resetSession(): void {
    this.sessionId = uuid();
  }

  setHoveredTaskId(id: string | null): void {
    this.hoveredTaskId = id;
  }

  setBoardDraggingTaskId(id: string | null): void {
    this.boardDraggingTaskId = id;
  }

  setOccupancyPresencePreview(preview: SprintPlannerOccupancyPresencePreview | null): void {
    this.occupancyPresencePreview = preview;
  }

  setResizingTaskId(id: string | null): void {
    this.resizingTaskId = id;
  }

  getStickyNoteCardRowOverride(
    taskId: string
  ): { layerShiftUp: number; span: number } | undefined {
    return this.stickyNoteCardRowOverrides.get(taskId);
  }

  setStickyNoteCardRowOverride(
    taskId: string,
    layout: { layerShiftUp: number; span: number }
  ): void {
    this.stickyNoteCardRowOverrides.set(taskId, layout);
    this.bumpCardLayoutRevision();
  }

  clearStickyNoteCardRowOverride(taskId: string): void {
    if (!this.stickyNoteCardRowOverrides.delete(taskId)) {
      return;
    }
    this.bumpCardLayoutRevision();
  }

  setStickyNoteCardRowPreview(
    preview: { layerShiftUp: number; span: number; taskId: string } | null
  ): void {
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
  commitStickyNoteCardRowLayout(taskId: string, layout: { layerShiftUp: number; span: number }): void {
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
      current?.startCell === preview?.startCell
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

  private bumpCardLayoutRevision(): void {
    this.cardLayoutRevision += 1;
  }

  setContextMenu(menu: SprintPlannerContextMenuState | null): void {
    this.contextMenu = menu;
  }

  setContextMenuTaskId(id: string | null): void {
    this.contextMenuTaskId = id;
  }

  closeContextMenu(): void {
    this.contextMenu = null;
    this.contextMenuTaskId = null;
  }

  openNoteComposer(state: SprintPlannerNoteComposerState): void {
    this.closeContextMenu();
    this.noteComposer = state;
    this.noteEditPreview = null;
  }

  closeNoteComposer(): void {
    this.noteComposer = null;
    this.noteEditPreview = null;
  }

  openDiagramEditor(taskId: string): void {
    this.closeContextMenu();
    this.closeNoteComposer();
    this.diagramEditorTaskId = taskId;
  }

  closeDiagramEditor(): void {
    this.diagramEditorTaskId = null;
  }

  openPhotoLightbox(taskId: string): void {
    this.closeContextMenu();
    this.photoLightboxTaskId = taskId;
  }

  closePhotoLightbox(): void {
    this.photoLightboxTaskId = null;
  }

  setNoteEditPreview(
    taskId: string,
    patch: Pick<SprintPlannerNoteEditPreview, 'color' | 'text'>
  ): void {
    if (this.noteEditPreview?.taskId === taskId) {
      this.noteEditPreview = { ...this.noteEditPreview, ...patch };
      return;
    }
    this.noteEditPreview = { taskId, ...patch };
  }

  clearNoteEditPreview(): void {
    this.noteEditPreview = null;
  }

  setNoteClipboard(clipboard: SwimlaneNoteClipboard | null): void {
    this.noteClipboard = clipboard;
  }

  setPlacementTool(tool: SwimlanePlacementTool): void {
    this.placementTool = tool;
    if (tool === 'link') {
      this.closeContextMenu();
      return;
    }
    this.linkingFromTaskId = null;
  }

  setStickyNoteColor(color: StickyNoteColor): void {
    const next = parseStickyNoteColor(color);
    this.stickyNoteColor = next;
    saveToStorage(STORAGE_KEYS.SWIMLANE_STICKY_NOTE_COLOR, next);
  }

  setAccountWorkModal(task: Task | null): void {
    this.accountWorkModal = task;
  }

  openTaskInfoPanel(task: Task): void {
    this.taskInfoPanelTask = task;
    this.closeContextMenu();
  }

  closeTaskInfoPanel(): void {
    this.taskInfoPanelTask = null;
  }

  patchTaskInfoPanelTask(fields: Partial<Pick<Task, 'description' | 'name'>>): void {
    if (!this.taskInfoPanelTask) {
      return;
    }
    this.taskInfoPanelTask = {
      ...this.taskInfoPanelTask,
      ...fields,
    };
  }

  setSegmentEditTaskId(id: string | null): void {
    this.segmentEditTaskId = id;
    if (id != null) {
      this.linkingFromTaskId = null;
    }
  }

  setLinkingFromTaskId(id: string | null): void {
    this.linkingFromTaskId = id;
    if (id != null) {
      this.segmentEditTaskId = null;
    }
  }

  setOpenCommentEditId(id: string | null): void {
    this.openCommentEditId = id;
  }

  setGlobalNameFilter(value: string): void {
    this.globalNameFilter = value;
  }

  setNotificationFocusTaskId(id: string | null): void {
    this.notificationFocusTaskId = id;
  }

  clearNotificationFocusTaskId(): void {
    this.notificationFocusTaskId = null;
  }

  /** Сброс преходящего UI при смене спринта (поиск, меню, редактор сегментов). */
  clearTransientUiOnSprintChange(): void {
    this.globalNameFilter = '';
    this.notificationFocusTaskId = null;
    this.segmentEditTaskId = null;
    this.linkingFromTaskId = null;
    this.contextMenu = null;
    this.contextMenuTaskId = null;
    this.noteComposer = null;
    this.noteEditPreview = null;
    this.diagramEditorTaskId = null;
    this.photoLightboxTaskId = null;
    this.openCommentEditId = null;
    this.hoveredTaskId = null;
    this.boardDraggingTaskId = null;
    this.occupancyPresencePreview = null;
    this.resizingTaskId = null;
    this.stickyNoteCardRowOverrides = new Map();
    this.stickyNoteCardRowPreview = null;
    this.taskResizePreview = null;
    this.cardLayoutRevision += 1;
    this.accountWorkModal = null;
    this.taskInfoPanelTask = null;
    this.placementTool = 'cursor';
  }
}
