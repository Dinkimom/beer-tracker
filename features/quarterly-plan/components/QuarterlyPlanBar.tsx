'use client';

import type { QuarterlyPlanAssignment } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { Developer } from '@/types';

import { useEffect } from 'react';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import {
  absentDaysWithinSpan,
  groupConsecutiveDays,
  overlapWeeks,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  formatSpanRange,
  QUARTER_ISSUE_HATCH,
  QUARTER_LANE_HEIGHT_PX,
  QUARTER_ROW_PADDING_PX,
  QUARTER_STICKY_LABEL_LEFT_PX,
} from '../quarterlyPlanBoardModel';
import { useQuarterSpanDrag } from '../useQuarterSpanDrag';

import { QuarterlyPlanResizeHandle } from './QuarterlyPlanResizeHandle';

const BAR_GAP_PX = 2;
/** Полоса в руке: приподнята над доской и чуть повёрнута, как магнит, который сняли. */
const BAR_LIFTED_STYLE = {
  boxShadow: '0 2px 4px rgb(0 0 0 / 0.12), 0 12px 22px -8px rgb(0 0 0 / 0.35)',
  transform: 'scale(1.015) rotate(-0.6deg)',
};
/** Вспышка полосы, к которой перешли по счётчику пересечений. */
const ISSUE_FOCUS_KEYFRAMES = [
  { boxShadow: '0 0 0 3px rgb(245 158 11 / 0.95)' },
  { boxShadow: '0 0 0 3px rgb(245 158 11 / 0.95)', offset: 0.6 },
  { boxShadow: '0 0 0 3px rgb(245 158 11 / 0)' },
];

interface QuarterlyPlanBarProps {
  assignment: QuarterlyPlanAssignment;
  /** Эпик готов: полоса приглушена. */
  faded?: boolean;
  /** Пересечения с отсутствием и с другими эпиками человека — одна пометка на полосе. */
  issues: string[];
  lane: number;
  member?: Developer;
  toneClass: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Полоса назначения: тянется целиком и за края, шаг — неделя. Клик без сдвига (или Enter) открывает меню.
 * Заштрихованы дни отсутствия и недели, где у человека стоит ещё один эпик, — видно, какая часть
 * работы под вопросом; причину называет подсказка у значка. Подпись липнет к левой колонке, пока полоса на экране.
 */
export function QuarterlyPlanBar({
  assignment,
  faded = false,
  issues,
  lane,
  member,
  toneClass,
}: QuarterlyPlanBarProps) {
  const {
    absenceByMember,
    assignmentsByMember,
    canLinkTo,
    focusedIssue,
    linking,
    onBarChange,
    onBarClick,
    onLinkBarClick,
    weeks,
  } = useQuarterlyPlanBoard();
  const isLinkSource = linking.sourceId === assignment.id;
  const isLinkTarget = canLinkTo(assignment.id);
  const weekCount = weeks.length;
  const { begin: beginDrag, drag, rootProps, rootRef, span } = useQuarterSpanDrag({
    span: assignment,
    weekCount,
    onChange: (next) => onBarChange(assignment.id, next),
    // С инструментом «Связь» клик по полосе выбирает её источником или целью, меню не открывается.
    onClick: (pointer) => (linking.armed ? onLinkBarClick(assignment.id) : onBarClick(assignment.id, pointer)),
  });
  const blockedDays = absenceByMember.get(assignment.memberId)?.blockedDays;
  const absentDays = blockedDays ? absentDaysWithinSpan(span, blockedDays) : [];
  const parallelDays = overlapWeeks(
    { ...assignment, ...span },
    assignmentsByMember.get(assignment.memberId) ?? []
  ).flatMap((week) =>
    Array.from(
      { length: QUARTER_WORKING_DAYS_PER_WEEK },
      (_, offset) => week * QUARTER_WORKING_DAYS_PER_WEEK + offset
    )
  );
  /** Дни под вопросом одним списком: участки двух причин не накладываются друг на друга. */
  const issueRanges = groupConsecutiveDays(
    [...new Set([...absentDays, ...parallelDays])].sort((a, b) => a - b)
  );
  const spanDays = span.weeks * QUARTER_WORKING_DAYS_PER_WEEK;
  const spanFirstDay = span.startWeek * QUARTER_WORKING_DAYS_PER_WEEK;
  const name = member?.name ?? assignment.memberId;

  const focusNonce = focusedIssue?.assignmentId === assignment.id ? focusedIssue.nonce : null;
  useEffect(() => {
    const root = rootRef.current;
    if (focusNonce === null || !root) return;
    root.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    root.animate(ISSUE_FOCUS_KEYFRAMES, { duration: 2200, easing: 'ease-out' });
  }, [focusNonce, rootRef]);

  return (
    <div
      ref={rootRef}
      aria-label={`${name}, ${formatSpanRange(weeks, span)}`}
      className={`group/bar absolute touch-none select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${linking.armed ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${isLinkTarget ? 'hover:ring-2 hover:ring-blue-400' : ''} ${faded ? 'opacity-50' : ''} ${drag ? '' : 'transition-[left,width] duration-200'}`}
      data-quarter-bar={assignment.id}
      style={{
        height: QUARTER_LANE_HEIGHT_PX - 4,
        left: `calc(${(span.startWeek / weekCount) * 100}% + ${BAR_GAP_PX}px)`,
        top: QUARTER_ROW_PADDING_PX + lane * QUARTER_LANE_HEIGHT_PX + 2,
        width: `calc(${(span.weeks / weekCount) * 100}% - ${BAR_GAP_PX * 2}px)`,
        zIndex: drag ? ZIndex.stickyInContent - 1 : ZIndex.contentInteractive,
      }}
      {...rootProps}
    >
      {/* Источник связи — синяя рамка с отступом, как у карточки-источника на доске спринта. Отдельным
          слоем: у самой полосы-кнопки тень в фокусе гасит глобальный сброс. */}
      {isLinkSource ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 rounded-[10px] ring-2 ring-blue-500 dark:ring-blue-400"
        />
      ) : null}
      {/* Магнит на доске: тот же картон, что у карточек планера, — кромка, тень в покое и подъём
          под курсором. Пока полосу несут, она приподнята и чуть повёрнута; при растягивании за край — нет. */}
      <div
        className={`retro-card-cardboard flex h-full items-center gap-1.5 overflow-clip rounded-lg border px-1.5 text-xs font-medium ${toneClass}`}
        style={drag?.mode === 'move' ? BAR_LIFTED_STYLE : undefined}
      >
        {issueRanges.map((range) => {
          // Участок у края полосы повторяет её скругление: обрезка по контуру оставляет на углу зубец.
          const startsAtEdge = range.startDay === spanFirstDay;
          const endsAtEdge = range.startDay + range.dayCount === spanFirstDay + spanDays;
          return (
            <span
              key={range.startDay}
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 ${startsAtEdge ? 'rounded-l-[7px]' : ''} ${endsAtEdge ? 'rounded-r-[7px]' : ''}`}
              style={{
                backgroundImage: QUARTER_ISSUE_HATCH,
                left: `${((range.startDay - spanFirstDay) / spanDays) * 100}%`,
                width: `${(range.dayCount / spanDays) * 100}%`,
              }}
            />
          );
        })}
        <span
          className="sticky flex min-w-0 items-center gap-1.5"
          style={{ left: QUARTER_STICKY_LABEL_LEFT_PX }}
        >
          {member ? (
            <Avatar
              avatarUrl={member.avatarUrl}
              initials={initialsOf(member.name)}
              initialsVariant={getAvatarVariantForDeveloper(member)}
              size="2xs"
            />
          ) : null}
          <span className="min-w-0 truncate">{name}</span>
        </span>
        <span className="flex-1" />
        {issues.length > 0 ? (
          <TextTooltip
            content={
              <div className="flex flex-col gap-0.5">
                {issues.map((issue) => (
                  <span key={issue}>{issue}</span>
                ))}
              </div>
            }
            side="top"
          >
            {/* Залитый кружок: значок читается и поверх штриховки; отступ справа — под рукоятку края. */}
            <span className="relative mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950">
              <Icon className="h-2.5 w-2.5" name="alert-triangle" />
            </span>
          </TextTooltip>
        ) : null}
{/* Цель связи под курсором подсвечена, как на доске спринта. */}
        {isLinkTarget ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-blue-400/20 opacity-0 group-hover/bar:opacity-100"
          />
        ) : null}
                <QuarterlyPlanResizeHandle active={drag?.mode === 'start'} rounded side="left" onPointerDown={beginDrag('start')} />
        <QuarterlyPlanResizeHandle active={drag?.mode === 'end'} rounded side="right" onPointerDown={beginDrag('end')} />
      </div>
    </div>
  );
}
