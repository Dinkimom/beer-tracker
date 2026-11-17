'use client';

import type { KeyboardEvent, MouseEvent } from 'react';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterBarsTop, useQuarterLaneHeight, useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { formatSpanRange, QUARTER_ROW_PADDING_PX, quarterBarToneClass } from '../quarterlyPlanBoardModel';
import { type QuarterPhaseRollup, rollupBarId } from '../quarterlyPlanDetail';

import { quarterMemberInitials } from './QuarterlyPlanBar';

/** Сколько аватаров помещается на сводной полосе; остальные — «+N». */
const MAX_AVATARS = 3;
/** С инструментом «Связь» сводная полоса — кнопка: курсор, отклик нажатия, фокус. */
const LINK_ARMED_CLASS =
  'cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

/** Возможная цель связи подсвечивается под курсором, остальные полосы — обычным hover кнопки. */
const LINK_TARGET_CLASS = { false: 'hover:brightness-95 dark:hover:brightness-110', true: 'hover:ring-2 hover:ring-inset hover:ring-blue-400' };

interface QuarterlyPlanRollupBarsProps {
  /** Строка готова: полосы приглушены (QE8). */
  faded?: boolean;
  rollups: readonly QuarterPhaseRollup[];
  /** Строка сводных полос — эпик или направление: по ней полоса становится концом связи (QL7). */
  rowId: string;
  /** Ключ палитры статуса строки, как у полос плана (QA9). */
  statusKey?: string;
}

/**
 * Сводные полосы строки на роадмэпе (QZ3): по одной на фазу — общий срок проработки и поставки и аватары тех,
 * кто ей занят.
 * Проработка — пунктир и бледная заливка, как у её полос на плане (QG1). Сроки и людей здесь не правят;
 * с инструментом «Связь» клик по полосе выбирает её источником или целью связи (QL7).
 */
export function QuarterlyPlanRollupBars({ faded = false, rollups, rowId, statusKey }: QuarterlyPlanRollupBarsProps) {
  const { t } = useI18n();
  const { canLinkTo, dayCount, linking, memberById, onLinkBarClick, weeks } = useQuarterlyPlanBoard();
  const laneHeightPx = useQuarterLaneHeight();
  const barsTopPx = useQuarterBarsTop();
  const toneClass = quarterBarToneClass(statusKey);

  return rollups.map((rollup) => {
    const range = formatSpanRange(weeks, { ...rollup, startWeek: 0, weeks: 0 });
    const phase = t(`quarterlyPlan.phase.${rollup.phase}`);
    const members = rollup.memberIds.flatMap((id) => memberById.get(id) ?? []);
    const names = members.map((member) => member.name).join(', ');
    const barId = rollupBarId(rowId, rollup.phase);
    const linkClass = linking.armed ? `${LINK_ARMED_CLASS} ${LINK_TARGET_CLASS[`${canLinkTo(barId)}`]}` : '';
    return (
      <div
        key={rollup.phase}
        className={`absolute flex items-center overflow-hidden rounded-lg border px-2 text-xs font-medium ${toneClass} ${
          rollup.phase === 'discovery' ? 'border-dashed bg-opacity-40 dark:bg-opacity-40' : ''
        } ${faded ? 'opacity-50' : ''} ${linkClass}`}
        data-quarter-bar={barId}
        data-quarter-rollup={rollup.phase}
        {...(linking.armed
          ? {
              onClick: (event: MouseEvent) => {
                event.stopPropagation();
                onLinkBarClick(barId);
              },
              onKeyDown: (event: KeyboardEvent) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onLinkBarClick(barId);
              },
              role: 'button',
              tabIndex: 0,
            }
          : {})}
        style={{
          height: laneHeightPx - 4,
          left: `calc(${(rollup.startDay / dayCount) * 100}% + 2px)`,
          top: QUARTER_ROW_PADDING_PX + barsTopPx + rollup.lane * laneHeightPx + 2,
          width: `calc(${(rollup.days / dayCount) * 100}% - 4px)`,
          zIndex: ZIndex.contentInteractive,
        }}
        title={[`${phase} · ${range}`, names].filter(Boolean).join('\n')}
      >
        {/* Источник связи — синяя рамка, как у полосы-источника на плане. Отдельным слоем: у самой
            полосы-кнопки тень в фокусе гасит глобальный сброс. */}
        {linking.sourceId === barId ? (
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-blue-500 dark:ring-blue-400" />
        ) : null}
        {/* Кто занят фазой: аватары стопкой, лишние — счётчиком; имена — в подсказке. */}
        <span className="mr-1.5 flex shrink-0 items-center -space-x-1.5">
          {members.slice(0, MAX_AVATARS).map((member) => (
            <Avatar
              key={member.id}
              avatarUrl={member.avatarUrl}
              className="ring-1 ring-white dark:ring-gray-800"
              initials={quarterMemberInitials(member.name)}
              initialsVariant={getAvatarVariantForDeveloper(member)}
              size="xs"
            />
          ))}
        </span>
        {members.length > MAX_AVATARS ? <span className="mr-1.5 shrink-0 opacity-70">+{members.length - MAX_AVATARS}</span> : null}
        <span className="truncate">
          {phase} · {range}
        </span>
      </div>
    );
  });
}
