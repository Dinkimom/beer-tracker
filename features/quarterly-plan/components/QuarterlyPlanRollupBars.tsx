'use client';

import type { QuarterPhaseRollup } from '../quarterlyPlanDetail';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterBarsTop, useQuarterLaneHeight, useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { formatSpanRange, QUARTER_ROW_PADDING_PX, quarterBarToneClass } from '../quarterlyPlanBoardModel';

import { quarterMemberInitials } from './QuarterlyPlanBar';

/** Сколько аватаров помещается на сводной полосе; остальные — «+N». */
const MAX_AVATARS = 3;

interface QuarterlyPlanRollupBarsProps {
  /** Строка готова: полосы приглушены (QE8). */
  faded?: boolean;
  rollups: readonly QuarterPhaseRollup[];
  /** Ключ палитры статуса строки, как у полос плана (QA9). */
  statusKey?: string;
}

/**
 * Сводные полосы строки на роадмэпе (QZ3): по одной на фазу — общий срок проработки и поставки и аватары тех,
 * кто ей занят.
 * Проработка — пунктир и бледная заливка, как у её полос на плане (QG1). Только для просмотра.
 */
export function QuarterlyPlanRollupBars({ faded = false, rollups, statusKey }: QuarterlyPlanRollupBarsProps) {
  const { t } = useI18n();
  const { dayCount, memberById, weeks } = useQuarterlyPlanBoard();
  const laneHeightPx = useQuarterLaneHeight();
  const barsTopPx = useQuarterBarsTop();
  const toneClass = quarterBarToneClass(statusKey);

  return rollups.map((rollup) => {
    const range = formatSpanRange(weeks, { ...rollup, startWeek: 0, weeks: 0 });
    const phase = t(`quarterlyPlan.phase.${rollup.phase}`);
    const members = rollup.memberIds.flatMap((id) => memberById.get(id) ?? []);
    const names = members.map((member) => member.name).join(', ');
    return (
      <div
        key={rollup.phase}
        className={`absolute flex items-center overflow-hidden rounded-lg border px-2 text-xs font-medium ${toneClass} ${
          rollup.phase === 'discovery' ? 'border-dashed bg-opacity-40 dark:bg-opacity-40' : ''
        } ${faded ? 'opacity-50' : ''}`}
        data-quarter-rollup={rollup.phase}
        style={{
          height: laneHeightPx - 4,
          left: `calc(${(rollup.startDay / dayCount) * 100}% + 2px)`,
          top: QUARTER_ROW_PADDING_PX + barsTopPx + rollup.lane * laneHeightPx + 2,
          width: `calc(${(rollup.days / dayCount) * 100}% - 4px)`,
          zIndex: ZIndex.contentInteractive,
        }}
        title={[`${phase} · ${range}`, names].filter(Boolean).join('\n')}
      >
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
