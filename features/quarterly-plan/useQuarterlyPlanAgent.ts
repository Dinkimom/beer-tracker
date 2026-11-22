'use client';

import type { QuarterlyPlanDraftReview } from './QuarterlyPlanBoardContext';
import type { QuarterlyPlanDraftDecision, QuarterlyPlanDraftView } from '@/lib/api/quarterlyPlans';
import type { QuarterlyPlanDraftItem } from '@/lib/quarterlyPlans/quarterlyPlanDraftItems';
import type { QuarterlyPlan, QuarterlyPlanContent, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { aggregateAgentSessionStatus } from '@/features/sprint/components/SprintPlanner/hooks/useAgentIslandChat';
import {
  AGENT_SESSIONS_QUERY_KEY,
  useAgentAvailable,
  useAgentBrand,
  useAgentSessions,
} from '@/features/swimlane/hooks/useAgentSessions';
import { quarterScope } from '@/lib/agentSessions/agentSessionScope';
import {
  approveQuarterlyPlanDraft,
  fetchQuarterlyPlanDraft,
  rejectQuarterlyPlanDraft,
} from '@/lib/api/quarterlyPlans';
import { diffQuarterlyPlanDraft, withRemovedFromDraft } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';

import { quarterlyPlanQueryKey } from './quarterlyPlanSync';

/**
 * Черновик агента и сессии по квартальному плану (QM9–QM11). Черновик личный и по каналу квартала (QS6) не ходит:
 * пока вкладка открыта, его перечитываем раз в несколько секунд (сессии опрашивает `useAgentSessions`).
 */
const POLL_MS = 5000;

export function useQuarterlyPlanAgent(
  ref: QuarterRef,
  setVersion: (version: number, content?: QuarterlyPlanContent) => void
) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { quarter, year } = ref;
  const draftKey = useMemo(() => ['quarterlyPlanDraft', year, quarter] as const, [quarter, year]);
  const scope = useMemo(() => quarterScope({ quarter, year }), [quarter, year]);
  // Сессии — тем же хуком, что у доски спринта: чат квартала — тот же компонент.
  const sessions = useAgentSessions(scope);
  const agentAvailable = useAgentAvailable(scope);
  const brand = useAgentBrand(scope);

  const draftQuery = useQuery({
    queryFn: () => fetchQuarterlyPlanDraft({ quarter, year }),
    queryKey: draftKey,
    refetchInterval: POLL_MS,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: draftKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: [AGENT_SESSIONS_QUERY_KEY] }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: quarterlyPlanQueryKey({ quarter, year }) }).catch(() => undefined);
  };

  const approve = useMutation({
    mutationFn: (decision: QuarterlyPlanDraftDecision) => approveQuarterlyPlanDraft({ quarter, year }, decision),
    onSuccess: (result, decision) => {
      if ('error' in result) {
        toast.error(t('quarterlyPlan.draft.applyFailed', { error: result.error }));
      } else {
        // План после принятия — сразу на доску (`setVersion` с содержимым): перечитанный придёт после
        // запроса в трекер, а черновик без принятых пунктов — раньше; иначе принятое на миг выглядело бы
        // снова предложенным.
        setVersion(result.version, result.content);
        // Пункты по одному — как на доске спринта, без тоста.
        if (!decision.itemIds) toast.success(t('quarterlyPlan.draft.approved'));
      }
      refresh();
    },
  });
  const reject = useMutation({
    mutationFn: (decision: QuarterlyPlanDraftDecision) => rejectQuarterlyPlanDraft({ quarter, year }, decision),
    onSuccess: refresh,
  });

  return {
    /** Показывать ли «Агент»: агент подключён или по кварталу уже есть сессии. */
    agentVisible: agentAvailable || sessions.openSessions.length > 0,
    approve: approve.mutate,
    brand,
    busy: approve.isPending || reject.isPending,
    draft: draftQuery.data ?? null,
    /** 💬 к черовику без ответа агента — число на кнопке агента. */
    openComments: sessions.openComments,
    reject: reject.mutate,
    scope,
    /** Чья очередь хоть в одной сессии — точка на кнопке агента, как на доске спринта. */
    status: aggregateAgentSessionStatus(sessions.openSessions),
  };
}

/**
 * Показ черновика на доске (QM9, QM10): план с черновиком (убранное — на месте, пока о нём не решили), что в нём
 * нового, изменённого и убранного, пункты для ✓/✗ на доске, скрыть/показать. Пока черновик показан, правки плана
 * не сохраняются — правка легла бы не туда, куда смотрит человек.
 */
export function useQuarterlyPlanDraftPreview(input: {
  /** Решения о черновике (`useQuarterlyPlanAgent`). */
  agent: Pick<ReturnType<typeof useQuarterlyPlanAgent>, 'approve' | 'brand' | 'busy' | 'reject'>;
  draft: QuarterlyPlanDraftView | null;
  savedPlan: QuarterlyPlan | null;
  saveEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
}) {
  const { t } = useI18n();
  const { agent, draft, savedPlan, saveEdit } = input;
  /** Скрытый черновик — по его версии: новый черновик снова показывается. */
  const [hiddenProposalId, setHiddenProposalId] = useState<string | null>(null);
  const preview = draft?.preview?.content ?? null;
  const showing = Boolean(preview && draft?.proposalId !== hiddenProposalId);
  const shown = useMemo(() => {
    if (!savedPlan || !preview || !showing) return null;
    const diff = diffQuarterlyPlanDraft(savedPlan, preview);
    return {
      after: { ...savedPlan, ...preview },
      board: { ...savedPlan, ...withRemovedFromDraft(savedPlan, preview) },
      marks: diff,
    };
  }, [preview, savedPlan, showing]);
  const { approve, brand, busy, reject } = agent;
  const proposalId = draft?.proposalId ?? null;
  const items = shown ? (draft?.items ?? null) : null;
  const board = shown?.board ?? null;
  /** ✓/✗ пунктов на доске (QM10): пока прошлое решение не дошло, новое не уходит. */
  const review = useMemo<QuarterlyPlanDraftReview | null>(() => {
    if (!items?.length || !board || !proposalId) return null;
    const toIdOfLink = new Map(board.links.map((link) => [link.id, link.toId]));
    const linkItemsByAssignment = new Map<string, QuarterlyPlanDraftItem[]>();
    for (const item of items) {
      const toId = item.kind === 'link' ? toIdOfLink.get(item.id) : undefined;
      if (toId) linkItemsByAssignment.set(toId, [...(linkItemsByAssignment.get(toId) ?? []), item]);
    }
    const decide = (run: (decision: QuarterlyPlanDraftDecision) => void) => (itemId: string) => {
      if (!busy) run({ itemIds: [itemId], proposalId });
    };
    return {
      brand,
      items: new Map(items.map((item) => [item.id, item])),
      linkItemsByAssignment,
      onApprove: decide(approve),
      onReject: decide(reject),
    };
  }, [approve, board, brand, busy, items, proposalId, reject]);
  const applyEdit = useCallback(
    (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => {
      if (showing) {
        toast(t('quarterlyPlan.draft.readOnly'));
        return false;
      }
      saveEdit(edit);
      return true;
    },
    [saveEdit, showing, t]
  );
  return {
    /** План, каким он станет после черновика: по нему считаются проблемы плана. */
    after: shown?.after ?? savedPlan,
    applyEdit,
    /** Пункты на доске; пусто — черновик скрыт или не применяется. */
    itemCount: items?.length ?? 0,
    marks: shown?.marks ?? null,
    /** План на доске: после черновика и с убранным на месте. */
    plan: shown?.board ?? savedPlan,
    review,
    showing,
    toggle: () => setHiddenProposalId(showing ? (draft?.proposalId ?? null) : null),
  };
}
