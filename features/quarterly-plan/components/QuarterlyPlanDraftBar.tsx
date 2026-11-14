'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { AgentProposalReviewBar } from '@/features/sprint/components/SprintPlanner/components/AgentProposalReviewBar';

interface QuarterlyPlanDraftBarProps {
  busy: boolean;
  /** Почему черновик не применяется; null — применяется. */
  error: string | null;
  /** Пунктов черновика на доске (QM10). */
  itemCount: number;
  showing: boolean;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onToggle: () => void;
}

/**
 * Строка ревью черновика агента над тулбаром (QM9, QM10) — та же, что на доске спринта: «‹ 1/N ›» по пунктам
 * на доске, «Принять все» и «Отклонить все». Своё у квартала — скрыть черновик, чтобы править план;
 * черновик, который больше не применяется, можно только отклонить.
 */
export function QuarterlyPlanDraftBar({
  busy,
  error,
  itemCount,
  showing,
  onApproveAll,
  onRejectAll,
  onToggle,
}: QuarterlyPlanDraftBarProps) {
  const { t } = useI18n();
  const toggleLabel = t(showing ? 'quarterlyPlan.draft.hide' : 'quarterlyPlan.draft.show');
  return (
    <AgentProposalReviewBar
      disabled={busy}
      total={showing ? itemCount : 0}
      onApproveAll={error ? undefined : onApproveAll}
      onRejectAll={onRejectAll}
    >
      {error ? (
        <span className="max-w-[20rem] truncate px-2 text-xs font-medium text-amber-700 dark:text-amber-300" title={error}>
          {t('quarterlyPlan.draft.notApplicable')}
        </span>
      ) : (
        <HeaderIconButton aria-pressed={!showing} className="!h-6 !w-6" title={toggleLabel} onClick={onToggle}>
          <Icon className="h-3.5 w-3.5" name={showing ? 'eye' : 'eye-off'} />
        </HeaderIconButton>
      )}
    </AgentProposalReviewBar>
  );
}
