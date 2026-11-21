import type { SprintPlannerContextMenuState } from '../sprintPlannerUiTypes';
import type { Task } from '@/types';

import { action, computed, makeObservable, observable } from 'mobx';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { getFromStorage, saveToStorage } from '@/hooks/localStorage/storagePrimitives';

/** Меню глазами карточки: открыто на ней; открыто на другой и приглушает остальные. */
export interface CardContextMenuState {
  dimmed: boolean;
  open: boolean;
}

/** Что открыто поверх доски: сайдбар, контекстное меню, панель задачи, окно учёта работ. */
export class PlannerOverlaysView {
  /** Открыт ли сайдбар планера (persist в localStorage). */
  sidebarOpen = true;

  /** Контекстное меню по задаче (позиция + задача). */
  contextMenu: SprintPlannerContextMenuState | null = null;

  /** Какая задача открыла контекстное меню (обводка карточки). */
  contextMenuTaskId: string | null = null;

  /** Модалка «учёт работ» по задаче. */
  accountWorkModal: Task | null = null;

  /** Правый сайдер с информацией о задаче (контекстное меню → «Информация о задаче»). */
  taskInfoPanelTask: Task | null = null;

  constructor() {
    this.sidebarOpen = getFromStorage(STORAGE_KEYS.SIDEBAR_OPEN, true);
    makeObservable(this, {
      accountWorkModal: observable,
      closeContextMenu: action.bound,
      closeTaskInfoPanel: action.bound,
      contextMenu: observable,
      contextMenuBlurOtherCards: computed,
      contextMenuTaskId: observable,
      openTaskInfoPanel: action.bound,
      patchTaskInfoPanelTask: action.bound,
      reset: action.bound,
      setAccountWorkModal: action.bound,
      setContextMenu: action.bound,
      setContextMenuTaskId: action.bound,
      setSidebarOpen: action.bound,
      sidebarOpen: observable,
      taskInfoPanelTask: observable,
    });
  }

  /** Меню открыто у точки и просит приглушить остальные карточки (по умолчанию — да). */
  get contextMenuBlurOtherCards(): boolean {
    return Boolean(this.contextMenu?.anchorRect) && this.contextMenu?.dimPeerUi !== false;
  }

  cardContextMenuState(taskId: string): CardContextMenuState {
    const menuTaskId = this.contextMenuTaskId;
    return {
      dimmed: this.contextMenuBlurOtherCards && menuTaskId != null && menuTaskId !== taskId,
      open: menuTaskId === taskId,
    };
  }

  setSidebarOpen(open: boolean | ((prev: boolean) => boolean)): void {
    const next = typeof open === 'function' ? open(this.sidebarOpen) : open;
    this.sidebarOpen = next;
    saveToStorage(STORAGE_KEYS.SIDEBAR_OPEN, next);
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
    this.taskInfoPanelTask = { ...this.taskInfoPanelTask, ...fields };
  }

  /** Смена спринта: меню и окна прошлой доски закрываются; сайдбар остаётся как был. */
  reset(): void {
    this.closeContextMenu();
    this.accountWorkModal = null;
    this.taskInfoPanelTask = null;
  }
}
