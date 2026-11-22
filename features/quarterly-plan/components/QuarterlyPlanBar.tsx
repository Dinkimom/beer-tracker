'use client';

import type { QuarterlyPlanAssignment } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { Developer } from '@/types';

import { useEffect, useState } from 'react';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { SprintCardPresenceAvatars } from '@/features/task/components/TaskCard/SprintCardPresenceAvatars';
import { assignmentPhase, assignmentSpanFields, daySpanFields, daySpanOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterBarsTop, useQuarterLaneHeight, useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import {
  formatSpanRange,
  QUARTER_BAR_LOOK_BY_LEVEL,
  type QuarterRowLevel,
  barDayMarks,
  draftOutlineClass,
  QUARTER_ROW_PADDING_PX,
  QUARTER_STICKY_LABEL_LEFT,
} from '../quarterlyPlanBoardModel';
import { useQuarterPresenceTarget } from '../QuarterlyPlanPresence';
import { useQuarterSpanDrag } from '../useQuarterSpanDrag';

import { QuarterlyPlanBarHatch } from './QuarterlyPlanBarHatch';
import { QuarterlyPlanBarIssueBadge } from './QuarterlyPlanBarIssueBadge';
import { draftItemsOf, QuarterlyPlanDraftItemToolbar } from './QuarterlyPlanDraftItemToolbar';
import { QuarterlyPlanResizeHandle } from './QuarterlyPlanResizeHandle';

const BAR_GAP_PX = 2;
/** Полоса такой длины и короче показывает только аватар. */
const COMPACT_BAR_DAYS = 2;
/**
 * Проработка — пунктирный контур и бледная заливка цвета статуса (заливка поставки под вуалью):
 * отличается от сплошной насыщенной поставки при любой ширине полосы (QG1).
 * У поставки кромка всегда сплошная: палитра статуса «Бэклог» даёт пунктир, а пунктир на полосе значит проработку.
 */
const PHASE_BAR_CLASS = {
  delivery: '!border-solid',
  discovery:
    '!border-dashed !border-current/50 [background-image:linear-gradient(rgb(255_255_255/0.6),rgb(255_255_255/0.6))] dark:[background-image:linear-gradient(rgb(31_41_55/0.6),rgb(31_41_55/0.6))]',
} as const;
/** Полоса в руке: приподнята над доской — тень и лёгкое увеличение, без поворота. */
const BAR_LIFTED_STYLE = {
  boxShadow: '0 2px 4px rgb(0 0 0 / 0.12), 0 12px 22px -8px rgb(0 0 0 / 0.35)',
  transform: 'scale(1.015)',
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
  /** Уровень строки: от него размер подписи и аватара (QT5). */
  level: QuarterRowLevel;
  member?: Developer;
  /** Риски, которые проблемой не считаются: дежурство в сроке (QV3). */
  risks: string[];
  /** Заливка, кромка и текст — по статусу строки (QA9). */
  toneClass: string;
}

/** Курсор полосы: занята другим человеком (QS7) — не взять; с инструментом «Связь» — клик; иначе — тащить. */
function barCursorClass(locked: boolean, linkArmed: boolean): string {
  if (locked) return 'cursor-not-allowed';
  return linkArmed ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing';
}

export function quarterMemberInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Полоса назначения: тянется целиком и за края, шаг — день (QT5). Клик без сдвига
 * (или Enter) открывает меню. Полоса на день-два показывает только аватар; картинка аватара
 * не ловит курсор — иначе браузер тащит её саму, а не полосу.
 * Заштрихованы дни отсутствия и недели, где у человека стоит ещё один эпик, — видно, какая часть
 * работы под вопросом; причину называет подсказка у значка. Подпись липнет к левой колонке, пока полоса на экране.
 */
export function QuarterlyPlanBar({
  assignment,
  faded = false,
  level,
  issues,
  lane,
  member,
  risks,
  toneClass,
}: QuarterlyPlanBarProps) {
  const { t } = useI18n();
  const { canLinkTo, focusedIssue, linking, onBarChange, onBarClick, onLinkBarClick, draftMarks, draftReview } = useQuarterlyPlanBoard();
  const { absenceByMember, dayCount, rivalAssignmentsOf, weeks } = useQuarterPlanView();
  /** Полосу добавил или изменил показанный черновик агента (QM9) — пунктирная обводка. */
  const draftOutline = draftOutlineClass(draftMarks, assignment.id);
  // ✓/✗ пункта черновика — под полосой: она поверх соседних, чтобы их не закрывали.
  const draftPending = draftItemsOf(draftReview, assignment.id).length > 0;
  const isLinkSource = linking.sourceId === assignment.id;
  const isLinkTarget = canLinkTo(assignment.id);
  // Жест считается в рабочих днях: шаг любой полосы — день (QT5).
  const saved = daySpanOf(assignment);
  const toDays = (steps: { startWeek: number; weeks: number }) => ({ days: steps.weeks, startDay: steps.startWeek });
  const [activity, setActivity] = useState<'dragging' | 'resizing' | null>(null);
  // Полосу несёт или растягивает другой человек (QS7): свои жесты и меню ждут, пока он закончит.
  const presence = useQuarterPresenceTarget(assignment.id, activity);
  const { begin: beginDrag, drag, rootProps, rootRef, span: steps } = useQuarterSpanDrag({
    disabled: presence.locked,
    span: { startWeek: saved.startDay, weeks: saved.days },
    weekCount: dayCount,
    onChange: (next) => onBarChange(assignment.id, assignmentSpanFields(toDays(next))),
    // С инструментом «Связь» клик по полосе выбирает её источником или целью, меню не открывается.
    onClick: (pointer) => (linking.armed ? onLinkBarClick(assignment.id) : onBarClick(assignment.id, pointer)),
    onEnd: () => setActivity(null),
    // Жест виден другим, только когда полоса сдвинулась: клик по ней её не занимает.
    onMove: (_span, _pointer, gesture) => setActivity(gesture.mode === 'move' ? 'dragging' : 'resizing'),
  });
  const span = daySpanFields(toDays(steps));
  /** Дорожка строки: у эпика она выше, чем у задачи, у направления — ещё выше; полоса занимает её целиком. */
  const laneHeightPx = useQuarterLaneHeight();
  const barsTopPx = useQuarterBarsTop();
  const marks = barDayMarks(
    { ...assignment, ...span },
    absenceByMember.get(assignment.memberId),
    rivalAssignmentsOf(assignment)
  );
  /** На день-два имя не помещается: остаётся аватар, срок и человек — в подсказке. */
  const compact = span.days <= COMPACT_BAR_DAYS;
  // Человека нет ни в одной команде плана — имени у доски нет (QI6).
  const name = member?.name ?? t('quarterlyPlan.formerMember');
  /** Проработка (QG1) — контур без заливки, фаза в подсказке; цвет — по статусу строки, как у остальных. */
  const phase = assignmentPhase(assignment);
  const phaseTitle = { delivery: undefined, discovery: t('quarterlyPlan.phase.discovery') }[phase];

  const ownTitle = compact ? `${name} · ${formatSpanRange(weeks, span)}` : phaseTitle;

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
      aria-label={`${name}, ${t(`quarterlyPlan.phase.${phase}`)}, ${formatSpanRange(weeks, span)}`}
      className={`group/bar absolute touch-none select-none rounded-lg [&_img]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${barCursorClass(presence.locked, linking.armed)} ${presence.ringClass} ${isLinkTarget ? 'hover:ring-2 hover:ring-blue-400' : ''} ${faded ? 'opacity-50' : ''} ${draftOutline} ${drag ? '' : 'transition-[left,width] duration-200'}`}
      data-quarter-bar={assignment.id}
      data-quarter-day-drag={drag ? 1 : undefined}
      style={{
        ...presence.ringStyle,
        height: laneHeightPx - 4,
        left: `calc(${(span.startDay / dayCount) * 100}% + ${BAR_GAP_PX}px)`,
        top: QUARTER_ROW_PADDING_PX + barsTopPx + lane * laneHeightPx + 2,
        width: `calc(${(span.days / dayCount) * 100}% - ${BAR_GAP_PX * 2}px)`,
        zIndex: drag ? ZIndex.stickyInContent - 1 : ZIndex.contentInteractive + Number(draftPending),
      }}
      title={presence.locked ? t('quarterlyPlan.presenceLocked') : ownTitle}
      {...rootProps}
      {...presence.hoverProps}
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
          под курсором. Пока полосу несут, она приподнята; при растягивании за край — нет. */}
      <div
        className={`retro-card-cardboard flex h-full items-center gap-1.5 overflow-clip rounded-lg border ${QUARTER_BAR_LOOK_BY_LEVEL[level].text} ${compact ? 'justify-center' : 'px-1.5'} ${toneClass} ${PHASE_BAR_CLASS[phase]}`}
        style={drag?.mode === 'move' ? BAR_LIFTED_STYLE : undefined}
      >
        <QuarterlyPlanBarHatch ranges={[...marks.issues, ...marks.risks]} span={span} />
        <span
          className="sticky flex min-w-0 items-center gap-1.5"
          style={{ left: QUARTER_STICKY_LABEL_LEFT }}
        >
          {member ? (
            <Avatar
              avatarUrl={member.avatarUrl}
              initials={quarterMemberInitials(member.name)}
              initialsVariant={getAvatarVariantForDeveloper(member)}
              size={QUARTER_BAR_LOOK_BY_LEVEL[level].avatar}
            />
          ) : null}
          <span className="min-w-0 truncate" hidden={compact}>
            {name}
          </span>
        </span>
        {compact ? null : (
          <>
            <span className="flex-1" />
            <QuarterlyPlanBarIssueBadge issues={issues} risks={risks} />
          </>
        )}
{/* Цель связи под курсором подсвечена, как на доске спринта. */}
        {isLinkTarget ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-blue-400/20 opacity-0 group-hover/bar:opacity-100"
          />
        ) : null}
                <QuarterlyPlanResizeHandle active={drag?.mode === 'start'} narrow={span.days <= 1} rounded side="left" onPointerDown={beginDrag('start')} />
        <QuarterlyPlanResizeHandle active={drag?.mode === 'end'} narrow={span.days <= 1} rounded side="right" onPointerDown={beginDrag('end')} />
      </div>
      {/* Кто ещё на этой полосе; на полосе в день-два аватару негде встать. */}
      {compact ? null : <SprintCardPresenceAvatars taskId={assignment.id} />}
      <QuarterlyPlanDraftItemToolbar hidden={drag !== null} id={assignment.id} placement="below" />
    </div>
  );
}
