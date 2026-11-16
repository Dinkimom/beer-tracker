'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { AvailabilityCardKind } from '@/lib/boardAvailability/availabilityCardKind';
import type { Developer } from '@/types';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { availabilityKindMessageKey } from '@/lib/boardAvailability/availabilityCardKind';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { QUARTER_LANE_HEIGHT_PX, QUARTER_ROW_PADDING_PX } from '../quarterlyPlanBoardModel';
import { useQuarterSpanDrag } from '../useQuarterSpanDrag';

import { QuarterlyPlanResizeHandle } from './QuarterlyPlanResizeHandle';

/** До скольких рабочих дней в плашке только аватар: имя в такую ширину не влезает и обрезалось бы до буквы. */
const AVATAR_ONLY_CHIP_DAYS = 3;
/** До скольких дней рядом с аватаром только имя, без вида отсутствия. */
const NAME_ONLY_CHIP_DAYS = 5;

/** Плашки без рамок: вид отсутствия читается по цвету заливки и подписи. */
const CHIP_KIND_CLASS: Record<AvailabilityCardKind, string> = {
  duty: 'bg-violet-100 text-violet-900 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30',
  sick_leave: 'bg-rose-100 text-rose-900 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30',
  vacation: 'bg-amber-100 text-amber-950 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30',
};

export interface QuarterAbsenceChip {
  /** Длина в рабочих днях. */
  days: number;
  id: string;
  kind: AvailabilityCardKind;
  member: Developer;
  range: string;
  /** Первый рабочий день квартала, который занимает плашка. */
  startDay: number;
}

interface QuarterlyPlanAbsenceChipProps {
  chip: QuarterAbsenceChip;
  lane: number;
  /** Плашку перенесли или растянули: новый срок в рабочих днях квартала. */
  onChange: (span: { days: number; startDay: number }) => void;
  onClick: (anchor: QuarterMenuAnchor) => void;
}

/**
 * Плашка отсутствия: ведёт себя как полоса назначения (QV4) — тянется целиком и за края, только шаг — день.
 * Клик без сдвига (или Enter) открывает меню с видом отсутствия и удалением.
 */
export function QuarterlyPlanAbsenceChip({ chip, lane, onChange, onClick }: QuarterlyPlanAbsenceChipProps) {
  const { t } = useI18n();
  const { dayCount } = useQuarterlyPlanBoard();
  const { begin, drag, rootProps, rootRef, span } = useQuarterSpanDrag({
    span: { startWeek: chip.startDay, weeks: chip.days },
    weekCount: dayCount,
    onChange: (next) => onChange({ days: next.weeks, startDay: next.startWeek }),
    onClick,
  });
  const firstName = chip.member.name.split(/\s+/)[0] ?? chip.member.name;
  const label = `${firstName} · ${t(availabilityKindMessageKey(chip.kind))}`;
  // Плашка на несколько дней — один аватар по центру; подлиннее — аватар и имя.
  // Вид отсутствия у коротких виден по цвету и в подсказке.
  const avatarOnly = span.weeks <= AVATAR_ONLY_CHIP_DAYS;
  const nameOnly = span.weeks <= NAME_ONLY_CHIP_DAYS;

  return (
    <TextTooltip content={`${label} · ${chip.range}`}>
      <div
        ref={rootRef}
        aria-label={`${label}, ${chip.range}`}
        className={`group/bar absolute flex cursor-grab touch-none select-none [&_img]:pointer-events-none items-center gap-1.5 overflow-hidden rounded-lg text-xs font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing ${avatarOnly ? 'justify-center' : 'px-1.5'} ${drag ? '' : 'transition-[left,width,background-color] duration-200'} ${CHIP_KIND_CLASS[chip.kind]}`}
        data-quarter-day-drag={drag ? 1 : undefined}
        style={{
          height: QUARTER_LANE_HEIGHT_PX - 4,
          left: `calc(${(span.startWeek / dayCount) * 100}% + 2px)`,
          top: QUARTER_ROW_PADDING_PX + lane * QUARTER_LANE_HEIGHT_PX + 2,
          width: `calc(${(span.weeks / dayCount) * 100}% - 4px)`,
          zIndex: drag ? ZIndex.stickyInContent - 1 : ZIndex.contentInteractive,
        }}
        {...rootProps}
      >
        <Avatar
          avatarUrl={chip.member.avatarUrl}
          initials={chip.member.name.charAt(0).toUpperCase()}
          initialsVariant={getAvatarVariantForDeveloper(chip.member)}
          size="2xs"
        />
        {avatarOnly ? null : <span className="truncate">{nameOnly ? firstName : label}</span>}
        <QuarterlyPlanResizeHandle active={drag?.mode === 'start'} narrow={span.weeks <= 1} rounded side="left" onPointerDown={begin('start')} />
        <QuarterlyPlanResizeHandle active={drag?.mode === 'end'} narrow={span.weeks <= 1} rounded side="right" onPointerDown={begin('end')} />
      </div>
    </TextTooltip>
  );
}
