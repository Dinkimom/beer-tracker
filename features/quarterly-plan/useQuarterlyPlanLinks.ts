'use client';

import type { QuarterlyPlanBoardContextValue } from './QuarterlyPlanBoardContext';
import type { QuarterlyPlan, QuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useMemo, useState } from 'react';

import { useEscapeKey } from '@/hooks/useEscapeKey';
import { addLink, areLinked, orderLinkEnds, removeLink } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

type LinksBoardSlice = Pick<
  QuarterlyPlanBoardContextValue,
  'canLinkTo' | 'linking' | 'onLinkBarClick' | 'onLinkDelete' | 'onLinkSourceClear'
>;

interface LinkingState {
  /** Связь начата из меню полосы: после одной связи инструмент выключается сам. */
  oneShot: boolean;
  sourceId: string | null;
}

interface UseQuarterlyPlanLinksInput {
  plan: QuarterlyPlan | null;
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
  /** Спросить подтверждение удаления связи. */
  confirmDelete: () => Promise<boolean>;
}

/**
 * Блокирующие зависимости между полосами — сценарий доски спринта. С инструментом «Связь» первый
 * клик по полосе выбирает источник, второй — цель; клик по источнику или мимо полос снимает выбор.
 * Инструмент остаётся включённым для следующей связи; Escape снимает выбор, затем выключает его.
 */
export function useQuarterlyPlanLinks({ applyEdit, confirmDelete, plan }: UseQuarterlyPlanLinksInput) {
  const [state, setState] = useState<LinkingState | null>(null);
  const armed = state !== null;
  const sourceId = state?.sourceId ?? null;

  const clearSource = () =>
    setState((current) => (current && !current.oneShot ? { oneShot: false, sourceId: null } : null));
  useEscapeKey(() => setState((current) => (current?.sourceId && !current.oneShot ? { oneShot: false, sourceId: null } : null)), {
    enabled: armed,
  });

  const links = plan?.links;
  const assignments = plan?.assignments;
  const board = useMemo<LinksBoardSlice>(() => {
    const canLinkTo = (assignmentId: string) =>
      sourceId !== null && assignmentId !== sourceId && !areLinked(links ?? [], sourceId, assignmentId);
    return {
      canLinkTo,
      linking: { armed, sourceId },
      onLinkBarClick: (assignmentId) => {
        const source = assignments?.find((assignment) => assignment.id === sourceId);
        const target = assignments?.find((assignment) => assignment.id === assignmentId);
        if (source && target && canLinkTo(assignmentId)) {
          applyEdit((content) => addLink(content, { id: crypto.randomUUID(), ...orderLinkEnds(source, target) }));
          setState((current) => (current?.oneShot ? null : { oneShot: false, sourceId: null }));
          return;
        }
        // Клик по источнику снимает выбор; по полосе, с которой связь уже есть, — делает её источником.
        setState((current) =>
          current ? { ...current, sourceId: assignmentId === current.sourceId ? null : assignmentId } : current
        );
      },
      onLinkDelete: (linkId) => {
        confirmDelete()
          .then((confirmed) => {
            if (confirmed) applyEdit((content) => removeLink(content, linkId));
          })
          .catch(() => undefined);
      },
      onLinkSourceClear: clearSource,
    };
  }, [applyEdit, armed, assignments, confirmDelete, links, sourceId]);

  return {
    armed,
    board,
    /** Включить или выключить инструмент «Связь». */
    setArmed: (next: boolean) => setState(next ? { oneShot: false, sourceId: null } : null),
    /** Начать одну связь от полосы — пункт её меню. */
    startFrom: (assignmentId: string) => setState({ oneShot: true, sourceId: assignmentId }),
  };
}
