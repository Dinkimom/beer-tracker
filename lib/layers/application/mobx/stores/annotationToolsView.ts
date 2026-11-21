import type {
  SprintPlannerNoteComposerState,
  SprintPlannerNoteEditPreview,
  SwimlaneNoteClipboard,
  SwimlanePlacementTool,
} from '../sprintPlannerUiTypes';
import type { PlannerOverlaysView } from './plannerOverlaysView';

import { action, makeObservable, observable } from 'mobx';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { getFromStorage, saveToStorage } from '@/hooks/localStorage/storagePrimitives';
import {
  DEFAULT_STICKY_NOTE_COLOR,
  parseStickyNoteColor,
  type StickyNoteColor,
} from '@/lib/comments/stickyNoteColor';

/**
 * Инструменты доски и режимы правки карточки: инструмент капсулы, цвет и буфер заметок, окна
 * заметки, схемы и фото, создание связи и правка отрезков. Открытие окна закрывает контекстное меню.
 */
export class AnnotationToolsView {
  /** Инструмент капсулы: чем плюс занимается в ячейке. */
  placementTool: SwimlanePlacementTool = 'cursor';

  /** Последний цвет стикера для инструмента «Заметка» (persist). */
  stickyNoteColor: StickyNoteColor = DEFAULT_STICKY_NOTE_COLOR;

  /** Скопированная заметка для вставки через «+» на ячейке. */
  noteClipboard: SwimlaneNoteClipboard | null = null;

  /** Попап редактирования заметки / конвертации в задачу. */
  noteComposer: SprintPlannerNoteComposerState | null = null;

  /** Предпросмотр текста и цвета стикера до сохранения. */
  noteEditPreview: SprintPlannerNoteEditPreview | null = null;

  /** Полноэкранный редактор схемы Excalidraw (`comment:id`). */
  diagramEditorTaskId: string | null = null;

  /** Полноэкранный просмотр фотокарточки на свимлейне. */
  photoLightboxTaskId: string | null = null;

  /** Режим создания связи (стрелки) на свимлейне: id задачи-источника. */
  linkingFromTaskId: string | null = null;

  /** Редактирование сегментов фазы на свимлейне. */
  segmentEditTaskId: string | null = null;

  constructor(private readonly overlays: PlannerOverlaysView) {
    this.stickyNoteColor = parseStickyNoteColor(
      getFromStorage(STORAGE_KEYS.SWIMLANE_STICKY_NOTE_COLOR, DEFAULT_STICKY_NOTE_COLOR)
    );
    makeObservable<AnnotationToolsView, 'overlays'>(this, {
      clearNoteEditPreview: action.bound,
      closeDiagramEditor: action.bound,
      closeNoteComposer: action.bound,
      closePhotoLightbox: action.bound,
      diagramEditorTaskId: observable,
      linkingFromTaskId: observable,
      noteClipboard: observable,
      noteComposer: observable,
      noteEditPreview: observable,
      openDiagramEditor: action.bound,
      openNoteComposer: action.bound,
      openPhotoLightbox: action.bound,
      overlays: false,
      photoLightboxTaskId: observable,
      placementTool: observable,
      reset: action.bound,
      segmentEditTaskId: observable,
      setLinkingFromTaskId: action.bound,
      setNoteClipboard: action.bound,
      setNoteEditPreview: action.bound,
      setPlacementTool: action.bound,
      setSegmentEditTaskId: action.bound,
      setStickyNoteColor: action.bound,
      stickyNoteColor: observable,
    });
  }

  openNoteComposer(state: SprintPlannerNoteComposerState): void {
    this.overlays.closeContextMenu();
    this.noteComposer = state;
    this.noteEditPreview = null;
  }

  closeNoteComposer(): void {
    this.noteComposer = null;
    this.noteEditPreview = null;
  }

  openDiagramEditor(taskId: string): void {
    this.overlays.closeContextMenu();
    this.closeNoteComposer();
    this.diagramEditorTaskId = taskId;
  }

  closeDiagramEditor(): void {
    this.diagramEditorTaskId = null;
  }

  openPhotoLightbox(taskId: string): void {
    this.overlays.closeContextMenu();
    this.photoLightboxTaskId = taskId;
  }

  closePhotoLightbox(): void {
    this.photoLightboxTaskId = null;
  }

  setNoteEditPreview(taskId: string, patch: Pick<SprintPlannerNoteEditPreview, 'color' | 'text'>): void {
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
      this.overlays.closeContextMenu();
      return;
    }
    this.linkingFromTaskId = null;
  }

  setStickyNoteColor(color: StickyNoteColor): void {
    const next = parseStickyNoteColor(color);
    this.stickyNoteColor = next;
    saveToStorage(STORAGE_KEYS.SWIMLANE_STICKY_NOTE_COLOR, next);
  }

  /** Правка отрезков и создание связи взаимоисключающие. */
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

  /** Смена спринта: окна и режимы прошлой доски закрываются; цвет и буфер заметки остаются. */
  reset(): void {
    this.noteComposer = null;
    this.noteEditPreview = null;
    this.diagramEditorTaskId = null;
    this.photoLightboxTaskId = null;
    this.linkingFromTaskId = null;
    this.segmentEditTaskId = null;
    this.placementTool = 'cursor';
  }
}
