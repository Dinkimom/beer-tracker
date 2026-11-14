'use client';

import type { QuarterlyPlanDraftView } from '@/lib/api/quarterlyPlans';
import type { QuarterlyPlan, QuarterlyPlanContent, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  AGENT_SESSIONS_QUERY_KEY,
  useAgentAvailable,
  useAgentSessions,
} from '@/features/swimlane/hooks/useAgentSessions';
import { quarterScope } from '@/lib/agentSessions/agentSessionScope';
import {
  approveQuarterlyPlanDraft,
  fetchQuarterlyPlanDraft,
  rejectQuarterlyPlanDraft,
} from '@/lib/api/quarterlyPlans';
import { diffQuarterlyPlanDraft } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';

/**
 * Черновик агента и сессии по квартальному плану (QM9–QM11). Своего realtime-канала у квартала нет:
 * пока вкладка открыта, черновик перечитываем раз в несколько секунд (сессии опрашивает `useAgentSessions`).
 */
const POLL_MS = 5000;

export function useQuarterlyPlanAgent(ref: QuarterRef) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { quarter, year } = ref;
  const draftKey = useMemo(() => ['quarterlyPlanDraft', year, quarter] as const, [quarter, year]);
  const scope = useMemo(() => quarterScope({ quarter, year }), [quarter, year]);
  // Сессии — тем же хуком, что у доски спринта: чат квартала — тот же компонент.
  const sessions = useAgentSessions(scope);
  const agentAvailable = useAgentAvailable(scope);

  const draftQuery = useQuery({
    queryFn: () => fetchQuarterlyPlanDraft({ quarter, year }),
    queryKey: draftKey,
    refetchInterval: POLL_MS,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: draftKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: [AGENT_SESSIONS_QUERY_KEY] }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ['quarterlyPlan', year, quarter] }).catch(() => undefined);
  };

  const approve = useMutation({
    mutationFn: (proposalId: string) => approveQuarterlyPlanDraft({ quarter, year }, proposalId),
    onSuccess: (result) => {
      if ('error' in result) toast.error(t('quarterlyPlan.draft.applyFailed', { error: result.error }));
      else toast.success(t('quarterlyPlan.draft.approved'));
      refresh();
    },
  });
  const reject = useMutation({
    mutationFn: (proposalId: string) => rejectQuarterlyPlanDraft({ quarter, year }, proposalId),
    onSuccess: refresh,
  });

  return {
    /** Показывать ли «Агент»: агент подключён или по кварталу уже есть сессии. */
    agentVisible: agentAvailable || sessions.openSessions.length > 0,
    approve: approve.mutate,
    busy: approve.isPending || reject.isPending,
    draft: draftQuery.data ?? null,
    reject: reject.mutate,
    scope,
    /** Агент ответил и ждёт человека. */
    waiting: sessions.openSessions.some((session) => session.status === 'waiting_user'),
  };
}

/**
 * Показ черновика на доске (QM9): план с черновиком, что в нём нового и изменённого, скрыть/показать.
 * Пока черновик показан, правки плана не сохраняются — правка легла бы не туда, куда смотрит человек.
 */
export function useQuarterlyPlanDraftPreview(input: {
  draft: QuarterlyPlanDraftView | null;
  savedPlan: QuarterlyPlan | null;
  saveEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
}) {
  const { t } = useI18n();
  const { draft, savedPlan, saveEdit } = input;
  /** Скрытый черновик — по его версии: новый черновик снова показывается. */
  const [hiddenProposalId, setHiddenProposalId] = useState<string | null>(null);
  const preview = draft?.preview?.content ?? null;
  const showing = Boolean(preview && draft?.proposalId !== hiddenProposalId);
  const diff = useMemo(() => (savedPlan && preview ? diffQuarterlyPlanDraft(savedPlan, preview) : null), [preview, savedPlan]);
  const plan = useMemo(
    () => (savedPlan && showing && preview ? { ...savedPlan, ...preview } : savedPlan),
    [preview, savedPlan, showing]
  );
  const applyEdit = useCallback(
    (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => {
      if (showing) {
        toast(t('quarterlyPlan.draft.readOnly'));
        return;
      }
      saveEdit(edit);
    },
    [saveEdit, showing, t]
  );
  return {
    applyEdit,
    diff,
    marks: showing && diff ? { added: diff.added, changed: diff.changed } : null,
    plan,
    showing,
    toggle: () => setHiddenProposalId(showing ? (draft?.proposalId ?? null) : null),
  };
}
