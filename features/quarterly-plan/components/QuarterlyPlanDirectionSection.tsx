'use client';

import type { QuarterlyPlanDirection, QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterRowNotes } from '../QuarterlyPlanBoardContext';
import {
  QUARTER_ROW_ACTION_CLASS,
  QUARTER_ROW_HEIGHT_PX,
  QUARTER_ROW_PADDING_PX,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanEpicRow } from './QuarterlyPlanEpicRow';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';

interface QuarterlyPlanDirectionSectionProps {
  collapsed: boolean;
  direction: QuarterlyPlanDirection;
  /** Эпики направления после фильтров. */
  epics: QuarterlyPlanEpic[];
  onToggle: () => void;
}

/**
 * Направление (веха): сворачиваемый заголовок, под ним эпики.
 * Свой таймлайн у направления пуст, пока оно раскрыто: сроки видны по полосам эпиков.
 */
export function QuarterlyPlanDirectionSection({
  collapsed,
  direction,
  epics,
  onToggle,
}: QuarterlyPlanDirectionSectionProps) {
  const { t } = useI18n();
  const { assignmentsByEpic, draft, onDraftSubmit, onRowMenu, trackerEpics, weeks } = useQuarterlyPlanBoard();
  // Заметки направления занимают его дорожку — сводная полоса тогда уходит к нижнему краю строки.
  const hasNotes = useQuarterRowNotes({ id: direction.id, kind: 'direction' }).notes.length > 0;

  /** Свёрнутое направление показывает общий срок своих эпиков одной тонкой полосой. */
  const spans = collapsed ? epics.flatMap((epic) => assignmentsByEpic.get(epic.id) ?? []) : [];
  const rollupStart = Math.min(...spans.map((span) => span.startWeek));
  /** Эпики без единой полосы; готовые не в счёт — планировать их уже незачем. */
  const unplannedCount = epics.filter(
    (epic) => !isEpicDone(epic, trackerEpics) && !assignmentsByEpic.get(epic.id)?.length
  ).length;
  const rollupEnd = Math.max(...spans.map((span) => span.startWeek + span.weeks));

  const renaming = draft?.kind === 'renameDirection' && draft.id === direction.id;
  const addingEpic = draft?.kind === 'newEpic' && draft.directionId === direction.id;

  return (
    <>
      <QuarterlyPlanRow
        heightPx={QUARTER_ROW_HEIGHT_PX}
        left={
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
                    {direction.title}
                  </span>
                </button>
                {unplannedCount > 0 ? (
                  <span className="shrink-0 text-xs text-ds-text-muted">
                    {t('quarterlyPlan.unplannedCount', { count: unplannedCount })}
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
        }
        noteRow={{ id: direction.id, kind: 'direction' }}
        notesTopPx={QUARTER_ROW_PADDING_PX}
        tone="direction"
      >
        {spans.length > 0 ? (
          <div
            aria-hidden
            className={`absolute h-1.5 rounded-full bg-gray-300 dark:bg-gray-500 ${hasNotes ? 'bottom-px !h-1' : 'top-1/2 -translate-y-1/2'}`}
            style={{
              left: `calc(${(rollupStart / weeks.length) * 100}% + 2px)`,
              width: `calc(${((rollupEnd - rollupStart) / weeks.length) * 100}% - 4px)`,
            }}
          />
        ) : null}
      </QuarterlyPlanRow>
      {collapsed
        ? null
        : epics.map((epic) => <QuarterlyPlanEpicRow key={epic.id} epic={epic} />)}
      {addingEpic ? (
        <QuarterlyPlanRow
          heightPx={QUARTER_ROW_HEIGHT_PX}
          left={
            <div className="flex min-w-0 flex-1 pl-9 pr-2">
              <QuarterlyPlanInlineInput
                placeholder={t('quarterlyPlan.addEpicPlaceholder')}
                onSubmit={onDraftSubmit}
              />
            </div>
          }
        />
      ) : null}
    </>
  );
}
