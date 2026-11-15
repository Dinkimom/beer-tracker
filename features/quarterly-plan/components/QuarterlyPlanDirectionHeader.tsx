'use client';

import type { QuarterlyPlanDirection } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { epicTitle } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { QUARTER_ROW_ACTION_CLASS } from '../quarterlyPlanBoardModel';

import { QuarterlyPlanDraftItemToolbar } from './QuarterlyPlanDraftItemToolbar';
import { QuarterlyPlanDraftMark } from './QuarterlyPlanDraftMark';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanIssueKey } from './QuarterlyPlanIssueKey';

interface QuarterlyPlanDirectionHeaderProps {
  collapsed: boolean;
  direction: QuarterlyPlanDirection;
  /** Эпики направления без единой полосы (QB6). */
  unplannedCount: number;
  onToggle: () => void;
}

/** Левая ячейка строки направления: название (или поле переименования), ключ трекера и действия. */
export function QuarterlyPlanDirectionHeader({
  collapsed,
  direction,
  unplannedCount,
  onToggle,
}: QuarterlyPlanDirectionHeaderProps) {
  const { t } = useI18n();
  const { draft, onDraftSubmit, onRowMenu, trackerEpics, unsplitDirectionIds } = useQuarterlyPlanBoard();
  const renaming = draft?.kind === 'renameDirection' && draft.id === direction.id;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 pl-2 pr-2">
      {renaming ? (
        <QuarterlyPlanInlineInput
          initialValue={direction.title}
          placeholder={t('quarterlyPlan.addDirectionPlaceholder')}
          onSubmit={onDraftSubmit}
        />
      ) : (
        <>
          <button
            aria-expanded={!collapsed}
            className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
            type="button"
            onClick={onToggle}
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-ds-text-muted"
              name={collapsed ? 'chevron-right' : 'chevron-down'}
            />
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {epicTitle(direction, trackerEpics)}
            </span>
            <QuarterlyPlanDraftMark id={direction.id} />
          </button>
          {direction.issueKey ? <QuarterlyPlanIssueKey issueKey={direction.issueKey} /> : null}
          <QuarterlyPlanDraftItemToolbar id={direction.id} placement="flow" />
          {unplannedCount > 0 ? (
            <span className="shrink-0 text-xs text-ds-text-muted">
              {t('quarterlyPlan.unplannedCount', { count: unplannedCount })}
            </span>
          ) : null}
          {unsplitDirectionIds.has(direction.id) ? (
            <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400" title={t('quarterlyPlan.unsplitHint')}>
              {t('quarterlyPlan.unsplit')}
            </span>
          ) : null}
          <span className="flex-1" />
          <HeaderIconButton
            className={QUARTER_ROW_ACTION_CLASS}
            title={t('quarterlyPlan.addEpic')}
            onClick={(event) =>
              onRowMenu({ id: direction.id, kind: 'addEpic' }, { x: event.clientX, y: event.clientY })
            }
          >
            <Icon className="h-3.5 w-3.5" name="plus" />
          </HeaderIconButton>
          <HeaderIconButton
            className={QUARTER_ROW_ACTION_CLASS}
            title={t('quarterlyPlan.rowActions')}
            onClick={(event) =>
              onRowMenu({ id: direction.id, kind: 'direction' }, { x: event.clientX, y: event.clientY })
            }
          >
            <Icon className="h-3.5 w-3.5" name="dots-horizontal" />
          </HeaderIconButton>
        </>
      )}
    </div>
  );
}
