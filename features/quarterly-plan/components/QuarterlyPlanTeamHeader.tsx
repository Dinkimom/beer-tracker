'use client';

import type { QuarterlyPlanTeam } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveWeekSpan } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import {
  QUARTER_ROW_ACTION_CLASS,
  QUARTER_ROW_HEIGHT_PX,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanRow } from './QuarterlyPlanRow';
import { QuarterlyPlanSprintCell } from './QuarterlyPlanSprintCell';

interface QuarterlyPlanTeamHeaderProps {
  collapsed: boolean;
  team: QuarterlyPlanTeam;
  onToggle: () => void;
}

/**
 * Заголовок команды, липнет под шапкой; по клику сворачивает команду до этой строки. Вдоль таймлайна — её спринты сплошной лентой:
 * у каждой команды своя сетка, границы спринтов видны по разделителям. Текущий спринт залит непрозрачно:
 * под ним лежит подсветка текущей недели, и полупрозрачная заливка распадалась бы на два оттенка.
 */
export const QuarterlyPlanTeamHeader = observer(function QuarterlyPlanTeamHeader({ collapsed, team, onToggle }: QuarterlyPlanTeamHeaderProps) {
  const { t } = useI18n();
  const { rows } = useQuarterlyPlanBoard();
  const { startDraft: onStartDraft } = rows;
  const { currentWeek, issueCountByTeam, weeks } = useQuarterPlanView();
  const issueCount = issueCountByTeam.get(team.id) ?? 0;

  return (
    <QuarterlyPlanRow
      heightPx={QUARTER_ROW_HEIGHT_PX}
      left={
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-2 pr-2">
          <button
            aria-expanded={!collapsed}
            className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
            type="button"
            onClick={onToggle}
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-ds-text-muted"
              name={collapsed ? 'chevron-right' : 'chevron-down'}
            />
            {/* Команда — верхний уровень доски: её название крупнее названия направления под ней. */}
            <span className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {team.title}
            </span>
          </button>
          <span className="shrink-0 text-xs text-ds-text-muted">
            {t('quarterlyPlan.teamMembers', { count: team.members.length })}
          </span>
          {/* В свёрнутой команде полос не видно — о пересечениях говорит счётчик. */}
          {collapsed && issueCount > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Icon className="h-3.5 w-3.5" name="alert-triangle" />
              {t('quarterlyPlan.issues', { count: issueCount })}
            </span>
          ) : null}
          <span className="flex-1" />
          <HeaderIconButton
            className={QUARTER_ROW_ACTION_CLASS}
            title={t('quarterlyPlan.addDirection')}
            onClick={() => onStartDraft({ kind: 'newDirection', teamId: team.id })}
          >
            <Icon className="h-3.5 w-3.5" name="plus" />
          </HeaderIconButton>
        </div>
      }
      noteRow={{ id: team.id, kind: 'team' }}
      notesTopPx={QUARTER_ROW_HEIGHT_PX}
      sticky
      tone="team"
    >
      {team.sprints.map((sprint) => {
        const span = resolveWeekSpan(weeks, sprint.startDate, sprint.endDate);
        if (!span) return null;
        return (
          <QuarterlyPlanSprintCell
            key={sprint.id}
            boardId={team.boardId}
            current={currentWeek >= span.startWeek && currentWeek < span.startWeek + span.weeks}
            divided={span.startWeek > 0}
            span={span}
            sprint={sprint}
          />
        );
      })}
    </QuarterlyPlanRow>
  );
});
