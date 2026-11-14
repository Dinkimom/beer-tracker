'use client';

import type { AgentSessionUserMessagePayload } from '@/lib/agentSessions/agentSession';
import type { QuarterlyPlanDraftView } from '@/lib/api/quarterlyPlans';
import type { QuarterlyPlan, QuarterlyPlanContent, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { quarterScope } from '@/lib/agentSessions/agentSessionScope';
import { createAgentSession, fetchAgentSessions, postAgentSessionMessage } from '@/lib/api/agentSessions';
import {
  approveQuarterlyPlanDraft,
  fetchQuarterlyPlanDraft,
  rejectQuarterlyPlanDraft,
} from '@/lib/api/quarterlyPlans';
import { diffQuarterlyPlanDraft } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';

/**
 * Черновик агента и сессии по квартальному плану (QM9–QM11). Своего realtime-канала у квартала нет:
 * пока вкладка открыта, перечитываем раз в несколько секунд — агент кладёт черновик и отвечает в сессии.
 */
const POLL_MS = 5000;

export function useQuarterlyPlanAgent(ref: QuarterRef) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { quarter, year } = ref;
  const draftKey = useMemo(() => ['quarterlyPlanDraft', year, quarter] as const, [quarter, year]);
  const sessionsKey = useMemo(() => ['quarterlyPlanAgentSessions', year, quarter] as const, [quarter, year]);
  const scope = useMemo(() => quarterScope({ quarter, year }), [quarter, year]);

  const draftQuery = useQuery({
    queryFn: () => fetchQuarterlyPlanDraft({ quarter, year }),
    queryKey: draftKey,
    refetchInterval: POLL_MS,
  });
  const sessionsQuery = useQuery({
    queryFn: () => fetchAgentSessions(scope),
    queryKey: sessionsKey,
    refetchInterval: POLL_MS,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: draftKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: sessionsKey }).catch(() => undefined);
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
  const send = useMutation({
    mutationFn: ({
      sessionId,
      ...message
    }: AgentSessionUserMessagePayload & { sessionId: string | null }) =>
      sessionId ? postAgentSessionMessage(sessionId, message) : createAgentSession(scope, { kind: 'plan', text: message.text }),
    onSuccess: refresh,
  });

  return {
    agentAvailable: sessionsQuery.data?.agentAvailable ?? false,
    approve: approve.mutate,
    busy: approve.isPending || reject.isPending || send.isPending,
    draft: draftQuery.data ?? null,
    draftSessionId: sessionsQuery.data?.draftSessionId ?? null,
    reject: reject.mutate,
    send: send.mutateAsync,
    sessions: sessionsQuery.data?.sessions ?? [],
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
