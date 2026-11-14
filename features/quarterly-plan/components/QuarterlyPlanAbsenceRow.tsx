'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { AvailabilityPopoverState } from '@/features/swimlane/hooks/useSwimlaneAvailabilityUi';
import type { AvailabilityCardKind } from '@/lib/boardAvailability/availabilityCardKind';
import type { QuarterlyPlanTeam } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useState } from 'react';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { SwimlaneAvailabilityPopoverGate } from '@/features/swimlane/components/SwimlaneAvailabilityPopoverGate';
import { availabilityKindMessageKey } from '@/lib/boardAvailability/availabilityCardKind';
import { assignBarLanes } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { QUARTER_LANE_HEIGHT_PX } from '../quarterlyPlanBoardModel';

import { QuarterlyPlanMenu } from './QuarterlyPlanMenu';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';

const CHIP_LANE_PX = 22;
const ROW_PADDING_PX = 7;
/** До скольких рабочих дней плашка считается короткой: в ней только аватар и имя. */
const SHORT_CHIP_DAYS = 3;
const TINY_CHIP_DAYS = 2;

/** Плашки без рамок: вид отсутствия читается по цвету заливки и подписи. */
const CHIP_KIND_CLASS: Record<AvailabilityCardKind, string> = {
  duty: 'bg-violet-100 text-violet-900 hover:bg-violet-200 active:bg-violet-300 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30',
  sick_leave: 'bg-rose-100 text-rose-900 hover:bg-rose-200 active:bg-rose-300 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30',
  'tech-sprint-back': 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 active:bg-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30',
  'tech-sprint-qa': 'bg-orange-100 text-orange-900 hover:bg-orange-200 active:bg-orange-300 dark:bg-orange-500/20 dark:text-orange-100 dark:hover:bg-orange-500/30',
  'tech-sprint-web': 'bg-sky-100 text-sky-900 hover:bg-sky-200 active:bg-sky-300 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/30',
  vacation: 'bg-amber-100 text-amber-950 hover:bg-amber-200 active:bg-amber-300 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30',
};

interface QuarterlyPlanAbsenceRowProps {
  team: QuarterlyPlanTeam;
}

/**
 * Отпуска и дежурства команды с точностью до дня. Это те же события, что на доске спринта:
 * клик по неделе добавляет отсутствие, клик по плашке открывает его на правку.
 */
export function QuarterlyPlanAbsenceRow({ team }: QuarterlyPlanAbsenceRowProps) {
  const { t } = useI18n();
  const { absenceByMember, dayCount, timelineStart, weeks } = useQuarterlyPlanBoard();
  const [picker, setPicker] = useState<{ anchor: QuarterMenuAnchor; week: number } | null>(null);
  const [popover, setPopover] = useState<AvailabilityPopoverState | null>(null);

  const chips = team.members.flatMap((member) =>
    (absenceByMember.get(member.id)?.segments ?? []).map((segment) => ({
      id: segment.eventId,
      kind: segment.kind,
      member,
      range: segment.dateRangeLabel,
      startWeek: segment.startDay,
      weeks: segment.dayIndices[segment.dayIndices.length - 1]! - segment.startDay + 1,
    }))
  );
  const { laneById, laneCount } = assignBarLanes(chips);
  // Плашки ниже дорожки заметки и считаются в днях: для заметок неделя с плашкой занята на всю
  // высоту плашек, свободная — с самого верха строки.
  const chipRows = Math.ceil((laneCount * CHIP_LANE_PX) / QUARTER_LANE_HEIGHT_PX);
  const noteBlockers = chips.map((chip) => {
    const startWeek = Math.floor(chip.startWeek / QUARTER_WORKING_DAYS_PER_WEEK);
    const lastWeek = Math.floor((chip.startWeek + chip.weeks - 1) / QUARTER_WORKING_DAYS_PER_WEEK);
    return { lane: 0, rows: chipRows, startWeek, weeks: lastWeek - startWeek + 1 };
  });

  return (
    <QuarterlyPlanRow
      heightPx={laneCount * CHIP_LANE_PX + ROW_PADDING_PX * 2}
      left={
        <span className="truncate px-3 text-xs text-ds-text-muted">
          {t('quarterlyPlan.absenceRow')}
        </span>
      }
      noteBlockers={noteBlockers}
      noteRow={{ id: team.id, kind: 'absence' }}
      notesTopPx={ROW_PADDING_PX}
      weekActionLabel={t('quarterlyPlan.absenceWeek')}
      onWeekClick={(week, anchor) => setPicker({ anchor, week })}
    >
      {chips.map((chip) => {
        const firstName = chip.member.name.split(/\s+/)[0] ?? chip.member.name;
        const label = `${firstName} · ${t(availabilityKindMessageKey(chip.kind))}`;
        // Короткой плашке хватает места на имя: вид отсутствия виден по цвету и в подсказке.
        // В плашку на день-два не влезает и аватар — он съел бы имя.
        const short = chip.weeks <= SHORT_CHIP_DAYS;
        const withAvatar = chip.weeks > TINY_CHIP_DAYS;
        return (
          <TextTooltip key={chip.id} content={`${label} · ${chip.range}`}>
            <button
              className={`absolute flex cursor-pointer items-center gap-1 overflow-hidden rounded text-[11px] font-medium leading-none transition-all duration-200 active:scale-[0.98] ${withAvatar ? 'px-0.5' : 'px-1'} ${CHIP_KIND_CLASS[chip.kind]}`}
              style={{
                height: CHIP_LANE_PX - 4,
                left: `calc(${(chip.startWeek / dayCount) * 100}% + 2px)`,
                top: ROW_PADDING_PX + (laneById.get(chip.id) ?? 0) * CHIP_LANE_PX + 2,
                width: `calc(${(chip.weeks / dayCount) * 100}% - 4px)`,
                zIndex: ZIndex.contentInteractive,
              }}
              type="button"
              onClick={() => {
                const event = absenceByMember
                  .get(chip.member.id)
                  ?.events.find((epic) => epic.id === chip.id);
                if (!event) return;
                setPopover({
                  boardId: team.boardId,
                  editing: event,
                  endDate: event.endDate,
                  memberId: chip.member.id,
                  memberName: chip.member.name,
                  startDate: event.startDate,
                });
              }}
            >
              {withAvatar ? (
                <Avatar
                  avatarUrl={chip.member.avatarUrl}
                  className="!h-3.5 !min-h-3.5 !w-3.5 !min-w-3.5"
                  initials={chip.member.name.charAt(0).toUpperCase()}
                  initialsVariant={getAvatarVariantForDeveloper(chip.member)}
                  size="2xs"
                />
              ) : null}
              <span className="truncate">{short ? firstName : label}</span>
            </button>
          </TextTooltip>
        );
      })}
      <SwimlaneAvailabilityPopoverGate
        popover={popover}
        sprintStartDate={timelineStart}
        sprintTimelineWorkingDays={dayCount}
        onClose={() => setPopover(null)}
      />
      {picker ? (
        <QuarterlyPlanMenu
          anchor={picker.anchor}
          sections={[
            {
              id: 'members',
              label: t('quarterlyPlan.absencePickMember'),
              rows: team.members.map((member) => ({
                icon: (
                  <Avatar
                    avatarUrl={member.avatarUrl}
                    initials={member.name.charAt(0).toUpperCase()}
                    initialsVariant={getAvatarVariantForDeveloper(member)}
                    size="2xs"
                  />
                ),
                id: member.id,
                label: member.name,
                onSelect: () =>
                  setPopover({
                    boardId: team.boardId,
                    editing: null,
                    endDate: weeks[picker.week]!.endDate,
                    memberId: member.id,
                    memberName: member.name,
                    startDate: weeks[picker.week]!.startDate,
                  }),
              })),
            },
          ]}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </QuarterlyPlanRow>
  );
}
