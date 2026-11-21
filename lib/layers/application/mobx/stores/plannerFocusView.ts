import { action, makeObservable, observable } from 'mobx';

/** Что подсвечено на доске и по какому имени она отфильтрована. */
export class PlannerFocusView {
  /** Глобальный фильтр по имени/ключу в планере. */
  globalNameFilter = '';

  /** Подсветка карточки после перехода из уведомления. */
  notificationFocusTaskId: string | null = null;

  /** Пара «призрак предложения ↔ оригинал» при наведении. */
  planPatchFocusTaskId: string | null = null;

  /** Наведение на черновик-замену заметки: swimlane-id оригинала — он и копия в кольце фокуса. */
  planPatchNoteFocusTaskId: string | null = null;

  constructor() {
    makeObservable(this, {
      clearNotificationFocusTaskId: action.bound,
      globalNameFilter: observable,
      notificationFocusTaskId: observable,
      planPatchFocusTaskId: observable,
      planPatchNoteFocusTaskId: observable,
      reset: action.bound,
      setGlobalNameFilter: action.bound,
      setNotificationFocusTaskId: action.bound,
      setPlanPatchFocusTaskId: action.bound,
      setPlanPatchNoteFocusTaskId: action.bound,
    });
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

  setPlanPatchFocusTaskId(id: string | null): void {
    this.planPatchFocusTaskId = id;
  }

  setPlanPatchNoteFocusTaskId(id: string | null): void {
    this.planPatchNoteFocusTaskId = id;
  }

  reset(): void {
    this.globalNameFilter = '';
    this.notificationFocusTaskId = null;
    this.planPatchFocusTaskId = null;
    this.planPatchNoteFocusTaskId = null;
  }
}
