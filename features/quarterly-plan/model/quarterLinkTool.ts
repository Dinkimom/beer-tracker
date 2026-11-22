/**
 * Инструмент «Связь» доски квартала — сценарий доски спринта. Первый клик по полосе выбирает источник,
 * второй — цель; клик по источнику или мимо полос снимает выбор. Инструмент остаётся включённым для
 * следующей связи; Escape снимает выбор, затем выключает его. Связь, начатая из меню полосы, — одна:
 * после неё инструмент выключается сам.
 */

import type { QuarterPlanView } from './quarterPlanView';
import type { QuarterlyPlanContent, QuarterlyPlanLink } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { action, computed, makeObservable, observable } from 'mobx';

import { addLink, areLinked } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { randomUuid } from '@/lib/randomUuid';

/** Что нужно инструментам для записи в план: берётся в момент действия, а не при отрисовке. */
export interface QuarterEditPort {
  view: QuarterPlanView | null;
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
  /** Спросить подтверждение удаления связи. */
  confirmLinkDelete: () => Promise<boolean>;
}

interface LinkingState {
  oneShot: boolean;
  sourceId: string | null;
}

export class QuarterLinkTool {
  private state: LinkingState | null = null;

  constructor(private readonly port: () => QuarterEditPort) {
    makeObservable<this, 'state'>(this, {
      armed: computed,
      clearSource: action.bound,
      clickBar: action.bound,
      escape: action.bound,
      setArmed: action.bound,
      sourceId: computed,
      startFrom: action.bound,
      state: observable.ref,
    });
  }

  get armed(): boolean {
    return this.state !== null;
  }

  get sourceId(): string | null {
    return this.state?.sourceId ?? null;
  }

  /** Полосу можно сделать целью связи от выбранного источника; `links` — связи, которые рисует доска. */
  readonly canLinkTo = (barId: string, links: readonly QuarterlyPlanLink[]): boolean => {
    const { sourceId } = this;
    return sourceId !== null && barId !== sourceId && !areLinked(links, sourceId, barId);
  };

  /** Включить или выключить инструмент. */
  setArmed(armed: boolean): void {
    this.state = armed ? { oneShot: false, sourceId: null } : null;
  }

  /** Одна связь от полосы — пункт её меню. */
  startFrom(assignmentId: string): void {
    this.state = { oneShot: true, sourceId: assignmentId };
  }

  /** Кликнули мимо полос или сменили уровень доски (полосы другие): выбор снимается, одиночная связь отменяется. */
  clearSource(): void {
    this.state = this.state && !this.state.oneShot ? { oneShot: false, sourceId: null } : null;
  }

  /** Escape: выбор источника снимается; без выбора — инструмент выключается. */
  escape(): void {
    this.state = this.state?.sourceId && !this.state.oneShot ? { oneShot: false, sourceId: null } : null;
  }

  /** Клик по полосе с включённым инструментом: источник, цель или снятие выбора. */
  clickBar(barId: string): void {
    const { applyEdit, view } = this.port();
    const { sourceId, state } = this;
    if (!state || !view) return;
    const ends = sourceId !== null && this.canLinkTo(barId, view.shownLinks) ? view.linkEnds(sourceId, barId) : null;
    if (ends) {
      applyEdit((content) => addLink(content, { id: randomUuid(), ...ends }));
      this.state = state.oneShot ? null : { oneShot: false, sourceId: null };
      return;
    }
    // Клик по источнику снимает выбор; по полосе, с которой связь уже есть, — делает её источником.
    this.state = { ...state, sourceId: barId === sourceId ? null : barId };
  }

  /** Стрелка уровня «Квартал» — все связи назначений между двумя сводными полосами: уходят вместе. */
  readonly deleteLink = (linkId: string): void => {
    const { applyEdit, confirmLinkDelete, view } = this.port();
    const removed = new Set(view?.shownLinks.find((link) => link.id === linkId)?.linkIds ?? [linkId]);
    confirmLinkDelete()
      .then((confirmed) => {
        if (confirmed) applyEdit((content) => ({ ...content, links: content.links.filter((link) => !removed.has(link.id)) }));
      })
      .catch(() => undefined);
  };
}
