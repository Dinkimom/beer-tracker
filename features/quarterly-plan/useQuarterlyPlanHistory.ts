'use client';

import type { QuarterlyPlanDraftReview } from './QuarterlyPlanBoardContext';
import type { QuarterlyPlanDraftDiff } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';
import type { QuarterlyPlan, QuarterlyPlanContent, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { fetchQuarterlyPlanVersion, fetchQuarterlyPlanVersions, restoreQuarterlyPlanVersion } from '@/lib/beerTrackerApi';
import { diffQuarterlyPlanDraft, withRemovedFromDraft } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';

import { quarterlyPlanQueryKey } from './quarterlyPlanSync';

const EMPTY_CONTENT: QuarterlyPlanContent = { assignments: [], directions: [], epics: [], links: [], notes: [] };

/** Ключ истории версий квартала: сохранение плана её сбрасывает. */
export const QUARTERLY_PLAN_VERSIONS_QUERY_KEY = 'quarterlyPlanVersions';

/** То, что доска рисует и правит: черновик агента (`useQuarterlyPlanDraftPreview`) или версия из истории. */
interface QuarterlyPlanBoardView {
  after: QuarterlyPlan | null;
  marks: QuarterlyPlanDraftDiff | null;
  plan: QuarterlyPlan | null;
  review: QuarterlyPlanDraftReview | null;
  /** Правка плана; false — доска только для просмотра (версия из истории, черновик агента), правка не прошла. */
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => boolean;
}

/**
 * Что показывает доска (QH4): выбранная версия из истории — поверх всего, только для просмотра, с пометками
 * её изменений и без пунктов черновика агента; иначе — как было (план или черновик агента).
 */
export function useQuarterlyPlanShownView(
  draftView: QuarterlyPlanBoardView,
  preview: { marks: QuarterlyPlanDraftDiff; plan: QuarterlyPlan } | null
): QuarterlyPlanBoardView {
  const { t } = useI18n();
  const readOnly = useCallback(() => {
    toast(t('quarterlyPlan.history.readOnly'));
    return false;
  }, [t]);
  if (!preview) return draftView;
  return { after: preview.plan, applyEdit: readOnly, marks: preview.marks, plan: preview.plan, review: null };
}

/**
 * История версий плана (QH3–QH5): сайдбар со списком, выбранная версия на доске — только для просмотра,
 * с пометками, что она поменяла относительно предыдущей, — и откат к ней.
 */
export function useQuarterlyPlanHistory(input: {
  ref: QuarterRef;
  savedPlan: QuarterlyPlan | null;
  /** Версия плана, поверх которой пойдёт откат (QS5). */
  getVersion: () => number;
  /** Откат записан: версия и восстановленный план — сразу на доску. */
  onRestored: (version: number, content: QuarterlyPlanContent) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { quarter, year } = input.ref;
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const versionsQuery = useQuery({
    enabled: open,
    queryFn: () => fetchQuarterlyPlanVersions({ quarter, year }),
    queryKey: [QUARTERLY_PLAN_VERSIONS_QUERY_KEY, year, quarter],
    refetchOnMount: 'always',
  });
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);
  /** Самая новая версия — это текущий план: её выбор возвращает доску к правке. */
  const previewId = selectedId && selectedId !== versions[0]?.id ? selectedId : null;
  const versionQuery = useQuery({
    enabled: open && previewId !== null,
    queryFn: () => fetchQuarterlyPlanVersion({ quarter, year }, previewId!),
    queryKey: ['quarterlyPlanVersion', year, quarter, previewId],
    staleTime: Infinity,
  });

  const { savedPlan } = input;
  const loaded = previewId ? versionQuery.data : undefined;
  const preview = useMemo(() => {
    if (!loaded || !savedPlan) return null;
    const previous = loaded.previousContent ?? EMPTY_CONTENT;
    return {
      marks: diffQuarterlyPlanDraft(previous, loaded.content),
      plan: { ...savedPlan, ...withRemovedFromDraft(previous, loaded.content) },
    };
  }, [loaded, savedPlan]);

  const restore = useMutation({
    mutationFn: (versionId: string) => restoreQuarterlyPlanVersion({ quarter, year }, versionId, input.getVersion()),
    onSuccess: (result) => {
      if ('conflict' in result) {
        toast.error(t('quarterlyPlan.history.restoreConflict'));
      } else {
        input.onRestored(result.version, result.content);
        toast.success(t('quarterlyPlan.history.restored'));
        setSelectedId(null);
      }
      queryClient.invalidateQueries({ queryKey: quarterlyPlanQueryKey({ quarter, year }) }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: [QUARTERLY_PLAN_VERSIONS_QUERY_KEY, year, quarter] }).catch(() => undefined);
    },
    onError: () => toast.error(t('quarterlyPlan.history.restoreFailed')),
  });

  return {
    close: () => {
      setOpen(false);
      setSelectedId(null);
    },
    loading: versionsQuery.isLoading,
    open,
    /** Доска показывает выбранную версию; null — текущий план. */
    preview,
    previewLoading: previewId !== null && versionQuery.isLoading,
    restore: (versionId: string) => restore.mutate(versionId),
    restoring: restore.isPending,
    select: setSelectedId,
    selectedId: previewId,
    toggle: () => {
      if (open) setSelectedId(null);
      setOpen((current) => !current);
    },
    versions,
  };
}
