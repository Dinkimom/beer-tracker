'use client';

import type { QuarterlyPlanDraftDiff } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_MENU_SHELL, FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';

/** Над тулбаром: высота острова тулбара и зазор. */
const ABOVE_TOOLBAR_PX = SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX + 52;

interface QuarterlyPlanDraftBarProps {
  busy: boolean;
  /** Что черновик меняет; null — пакет больше не применяется к плану. */
  diff: QuarterlyPlanDraftDiff | null;
  /** Почему черновик не применяется; null — применяется. */
  error: string | null;
  showing: boolean;
  summary: string;
  onApprove: () => void;
  onReject: () => void;
  onToggle: () => void;
}

/**
 * Черновик агента над доской (QM9, QM10): что он меняет, показать план с ним, принять целиком или отклонить.
 * Пока черновик показан, план не правится — доска рисует план после черновика.
 */
export function QuarterlyPlanDraftBar({
  busy,
  diff,
  error,
  showing,
  summary,
  onApprove,
  onReject,
  onToggle,
}: QuarterlyPlanDraftBarProps) {
  const { t } = useI18n();
  const parts = diff
    ? (['directions', 'epics', 'assignments', 'notes', 'links'] as const).flatMap((collection) => {
        const { added, changed, removed } = diff.counts[collection];
        const name = t(`quarterlyPlan.draft.kind.${collection}`);
        return [
          ...(added ? [`+${added} ${name}`] : []),
          ...(changed ? [`~${changed} ${name}`] : []),
          ...(removed ? [`−${removed} ${name}`] : []),
        ];
      })
    : [];

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ bottom: ABOVE_TOOLBAR_PX, zIndex: ZIndex.floatingControls }}
    >
      <div
        className={`pointer-events-auto flex max-w-[90%] items-center gap-2 px-3 py-2 !rounded-xl text-sm ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" name="sparkles" />
        <span className="min-w-0 truncate font-medium text-gray-900 dark:text-gray-100" title={summary}>
          {t('quarterlyPlan.draft.title')}
        </span>
        {error ? (
          <span className="min-w-0 truncate text-amber-700 dark:text-amber-300" title={error}>
            {t('quarterlyPlan.draft.notApplicable')}
          </span>
        ) : (
          <span className="min-w-0 truncate text-ds-text-muted" title={parts.join(', ')}>
            {parts.length > 0 ? parts.join(' · ') : t('quarterlyPlan.draft.noChanges')}
          </span>
        )}
        {error ? null : (
          <Button className="h-8 shrink-0 !px-2.5 !py-0" disabled={busy} variant="ghost" onClick={onToggle}>
            {t(showing ? 'quarterlyPlan.draft.hide' : 'quarterlyPlan.draft.show')}
          </Button>
        )}
        <Button className="h-8 shrink-0 !px-2.5 !py-0" disabled={busy} variant="outline" onClick={onReject}>
          {t('quarterlyPlan.draft.reject')}
        </Button>
        {error ? null : (
          <Button className="h-8 shrink-0 !px-2.5 !py-0" disabled={busy} onClick={onApprove}>
            {t('quarterlyPlan.draft.approve')}
          </Button>
        )}
      </div>
    </div>
  );
}
