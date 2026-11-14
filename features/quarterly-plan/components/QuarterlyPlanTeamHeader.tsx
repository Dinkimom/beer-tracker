'use client';

import type { QuarterlyPlanTeam } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveWeekSpan } from '@/lib/quarterlyPlans/quarterWeeks';
import { formatSprintDisplayName } from '@/utils/sprintDisplayName';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  QUARTER_ROW_ACTION_CLASS,
  QUARTER_ROW_HEIGHT_PX,
  QUARTER_STICKY_LABEL_LEFT,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanRow } from './QuarterlyPlanRow';

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
export function QuarterlyPlanTeamHeader({ collapsed, team, onToggle }: QuarterlyPlanTeamHeaderProps) {
  const { t } = useI18n();
  const { currentWeek, issueCountByTeam, onStartDraft, weeks } = useQuarterlyPlanBoard();
  const weekCount = weeks.length;
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
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
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
        const isCurrent = currentWeek >= span.startWeek && currentWeek < span.startWeek + span.weeks;
        return (
          <div
            key={sprint.id}
            className={`absolute inset-y-0 flex items-start justify-center px-2 text-[11px] ${
              span.startWeek > 0 ? 'border-l border-ds-border-subtle' : ''
            } ${
              isCurrent
                ? 'bg-blue-100 font-semibold text-blue-800 dark:bg-[#31496d] dark:text-blue-100'
                : 'text-ds-text-muted'
            }`}
            style={{
              left: `calc(${(span.startWeek / weekCount) * 100}% - 1px)`,
              width: `${(span.weeks / weekCount) * 100}%`,
            }}
          >
            {/* Ячейка спринта — на всю высоту строки, вместе с заметками команды; подпись — в верхней ленте. */}
            {/* Номер спринта без названия команды — как в селекторе спринта планера; полное имя — в подсказке. */}
            <span
              className="sticky right-2 truncate"
              style={{ left: QUARTER_STICKY_LABEL_LEFT, lineHeight: `${QUARTER_ROW_HEIGHT_PX}px` }}
              title={sprint.name}
            >
              {formatSprintDisplayName(sprint.name)}
            </span>
          </div>
        );
      })}
    </QuarterlyPlanRow>
  );
}
