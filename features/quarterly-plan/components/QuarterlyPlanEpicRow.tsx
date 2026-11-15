'use client';

import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { epicTitle, isEpicDone, trackerEpicOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  layoutRowBars,
  QUARTER_ROW_ACTION_CLASS,
  QUARTER_ROW_PADDING_PX,
  QUARTER_STATUS_PALETTE_KEY,
  QUARTER_STICKY_LABEL_LEFT,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanDraftItemToolbar } from './QuarterlyPlanDraftItemToolbar';
import { QuarterlyPlanDraftMark } from './QuarterlyPlanDraftMark';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanIssueKey } from './QuarterlyPlanIssueKey';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';
import { QuarterlyPlanRowBars } from './QuarterlyPlanRowBars';

interface QuarterlyPlanEpicRowProps {
  epic: QuarterlyPlanEpic;
}

/**
 * Эпик направления: клик по свободной неделе назначает человека, параллельная работа — дорожками
 * в одной строке (второго человека на занятые недели добавляют из меню полосы).
 */
export function QuarterlyPlanEpicRow({ epic }: QuarterlyPlanEpicRowProps) {
  const { t } = useI18n();
  const { assignmentsByEpic, draft, onCellClick, onDraftSubmit, onRowMenu, onStatusClick, trackerEpics } =
    useQuarterlyPlanBoard();
  const assignments = assignmentsByEpic.get(epic.id) ?? [];
  const { laneById, laneCount, noteBlockers, occupiedWeeks } = layoutRowBars(assignments);
  const renaming = draft?.kind === 'renameEpic' && draft.id === epic.id;
  /** Готовый эпик уходит на второй план: приглушён и зачёркнут (QE8). */
  const done = isEpicDone(epic, trackerEpics);
  const title = epicTitle(epic, trackerEpics);
  /** У привязанного эпика статус из трекера и вручную не меняется (QE7). */
  const tracked = trackerEpicOf(epic, trackerEpics);
  return (
    <QuarterlyPlanRow
      heightPx={quarterRowHeightPx(laneCount)}
      left={
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-9 pr-2">
          {renaming ? (
            <QuarterlyPlanInlineInput
              initialValue={epic.title}
              placeholder={t('quarterlyPlan.addEpicPlaceholder')}
              onSubmit={onDraftSubmit}
            />
          ) : (
            <>
              <OverflowTooltip content={title}>
                <span
                  className={`truncate text-sm ${
                    done ? 'text-ds-text-muted line-through opacity-70' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {title}
                </span>
              </OverflowTooltip>
              {epic.issueKey ? <QuarterlyPlanIssueKey issueKey={epic.issueKey} /> : null}
              <QuarterlyPlanDraftMark id={epic.id} />
              <QuarterlyPlanDraftItemToolbar id={epic.id} placement="flow" />
              <span className="flex-1" />
              <HeaderIconButton
                className={QUARTER_ROW_ACTION_CLASS}
                title={t('quarterlyPlan.rowActions')}
                onClick={(event) =>
                  onRowMenu({ id: epic.id, kind: 'epic' }, { x: event.clientX, y: event.clientY })
                }
              >
                <Icon className="h-3.5 w-3.5" name="dots-horizontal" />
              </HeaderIconButton>
            </>
          )}
          {epic.issueKey ? (
            <span className="shrink-0" title={t('quarterlyPlan.statusFromTracker')}>
              <StatusTag
                label={tracked?.statusDisplay || t(`quarterlyPlan.status.${epic.status}`)}
                status={tracked?.statusColorKey ?? QUARTER_STATUS_PALETTE_KEY[epic.status]}
              />
            </span>
          ) : (
            <button
              aria-label={t('quarterlyPlan.changeStatus')}
              className="shrink-0 cursor-pointer rounded-md transition-all duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] active:brightness-90 dark:hover:brightness-125"
              type="button"
              onClick={(event) => onStatusClick(epic.id, { x: event.clientX, y: event.clientY })}
            >
              <StatusTag
                label={t(`quarterlyPlan.status.${epic.status}`)}
                status={QUARTER_STATUS_PALETTE_KEY[epic.status]}
              />
            </button>
          )}
        </div>
      }
      noteBlockers={noteBlockers}
      noteRow={{ id: epic.id, kind: 'epic' }}
      notesTopPx={QUARTER_ROW_PADDING_PX}
      occupiedWeeks={occupiedWeeks}
      weekActionLabel={t('quarterlyPlan.assignWeek', { title: epic.title })}
      onWeekClick={(week, anchor) => onCellClick({ id: epic.id, kind: 'epic' }, week, anchor)}
    >
      {/* Эпик без единой полосы: пометка в начале таймлайна, клики по неделям проходят сквозь неё. */}
      {assignments.length === 0 && !done ? (
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <span
            className="sticky ml-1.5 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-xs text-ds-text-muted dark:border-gray-600"
            style={{ left: QUARTER_STICKY_LABEL_LEFT }}
          >
            {t('quarterlyPlan.unplanned')}
          </span>
        </div>
      ) : null}
      <QuarterlyPlanRowBars assignments={assignments} faded={done} laneById={laneById} />
    </QuarterlyPlanRow>
  );
}
