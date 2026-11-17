'use client';

import type { QuarterlyPlanBoardContextValue } from './QuarterlyPlanBoardContext';
import type { QuarterlyPlan, QuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useMemo, useState } from 'react';

import { useEscapeKey } from '@/hooks/useEscapeKey';
import { addLink, areLinked, orderLinkEnds } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { rollupLinkEnds, rollupLinks } from './quarterlyPlanDetail';

type LinksBoardSlice = Pick<
  QuarterlyPlanBoardContextValue,
  'canLinkTo' | 'linking' | 'onLinkBarClick' | 'onLinkDelete' | 'onLinkSourceClear' | 'shownLinks'
>;

interface LinkingState {
  /** Связь начата из меню полосы: после одной связи инструмент выключается сам. */
  oneShot: boolean;
  sourceId: string | null;
}

interface UseQuarterlyPlanLinksInput {
  plan: QuarterlyPlan | null;
  /** Доска на уровне «Квартал»: связывают сводные полосы, связь ложится между их назначениями (QL7). */
  quarterView: boolean;
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
  /** Спросить подтверждение удаления связи. */
  confirmDelete: () => Promise<boolean>;
}

/**
 * Блокирующие зависимости между полосами — сценарий доски спринта. С инструментом «Связь» первый
 * клик по полосе выбирает источник, второй — цель; клик по источнику или мимо полос снимает выбор.
 * Инструмент остаётся включённым для следующей связи; Escape снимает выбор, затем выключает его.
 * На уровне «Квартал» полосы — сводные: `sourceId` и связи доски (`shownLinks`) — про них (QL7).
 */
export function useQuarterlyPlanLinks({ applyEdit, confirmDelete, plan, quarterView }: UseQuarterlyPlanLinksInput) {
  const [state, setState] = useState<LinkingState | null>(null);
  // Сменили уровень доски — полосы другие: выбранный источник снимаем, инструмент остаётся.
  const [stateQuarterView, setStateQuarterView] = useState(quarterView);
  if (stateQuarterView !== quarterView) {
    setStateQuarterView(quarterView);
    setState((current) => (current && !current.oneShot ? { oneShot: false, sourceId: null } : null));
  }
  const armed = state !== null;
  const sourceId = state?.sourceId ?? null;

  const clearSource = () =>
    setState((current) => (current && !current.oneShot ? { oneShot: false, sourceId: null } : null));
  useEscapeKey(() => setState((current) => (current?.sourceId && !current.oneShot ? { oneShot: false, sourceId: null } : null)), {
    enabled: armed,
  });

  const board = useMemo<LinksBoardSlice>(() => {
    const shownLinks: LinksBoardSlice['shownLinks'] = (quarterView && plan ? rollupLinks(plan) : plan?.links) ?? [];
    const canLinkTo = (barId: string) => sourceId !== null && barId !== sourceId && !areLinked(shownLinks, sourceId, barId);
    /** Концы новой связи в плане — всегда назначения; null — такой связи не поставить. */
    const linkEnds = (targetId: string) => {
      if (!plan || sourceId === null || !canLinkTo(targetId)) return null;
      if (quarterView) return rollupLinkEnds(plan, sourceId, targetId);
      const source = plan.assignments.find((assignment) => assignment.id === sourceId);
      const target = plan.assignments.find((assignment) => assignment.id === targetId);
      return source && target ? orderLinkEnds(source, target) : null;
    };
    return {
      canLinkTo,
      linking: { armed, sourceId },
      onLinkBarClick: (barId) => {
        const ends = linkEnds(barId);
        if (ends) {
          applyEdit((content) => addLink(content, { id: crypto.randomUUID(), ...ends }));
          setState((current) => (current?.oneShot ? null : { oneShot: false, sourceId: null }));
          return;
        }
        // Клик по источнику снимает выбор; по полосе, с которой связь уже есть, — делает её источником.
        setState((current) => (current ? { ...current, sourceId: barId === current.sourceId ? null : barId } : current));
      },
      onLinkDelete: (linkId) => {
        // Стрелка уровня «Квартал» — все связи назначений между двумя сводными полосами: уходят вместе.
        const removed = new Set(shownLinks.find((link) => link.id === linkId)?.linkIds ?? [linkId]);
        confirmDelete()
          .then((confirmed) => {
            if (confirmed) applyEdit((content) => ({ ...content, links: content.links.filter((link) => !removed.has(link.id)) }));
          })
          .catch(() => undefined);
      },
      onLinkSourceClear: clearSource,
      shownLinks,
    };
  }, [applyEdit, armed, confirmDelete, plan, quarterView, sourceId]);

  return {
    armed,
    board,
    /** Включить или выключить инструмент «Связь». */
    setArmed: (next: boolean) => setState(next ? { oneShot: false, sourceId: null } : null),
    /** Начать одну связь от полосы — пункт её меню. */
    startFrom: (assignmentId: string) => setState({ oneShot: true, sourceId: assignmentId }),
  };
}
