'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { AvailabilityCardKind } from '@/lib/boardAvailability/availabilityCardKind';
import type { QuarterlyPlanTeam } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useState } from 'react';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { availabilityKindMessageKey } from '@/lib/boardAvailability/availabilityCardKind';
import { assignBarLanes } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  absenceDatesAfterDrag,
  QUARTER_ABSENCE_ROW_KINDS,
  type QuarterAbsenceRowGroup,
  QUARTER_ROW_PADDING_PX,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';
import { useQuarterAbsenceEdits } from '../useQuarterAbsenceEdits';

import { QuarterlyPlanAbsenceChip, type QuarterAbsenceChip } from './QuarterlyPlanAbsenceChip';
import { QuarterlyPlanMenu } from './QuarterlyPlanMenu';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';

interface QuarterlyPlanAbsenceRowProps {
  /** Какие события в строке: дежурства или отпуска с больничными. */
  group: QuarterAbsenceRowGroup;
  team: QuarterlyPlanTeam;
}

/**
 * Строка отсутствий команды с точностью до дня: дежурства или отпуска с больничными (QV2). Это те же события, что на доске спринта, а ведут
 * себя как полосы (QV4): клик по неделе и выбор человека ставят отсутствие на эту неделю, плашку
 * тянут и растягивают по дням, клик по ней открывает меню с видом и удалением.
 */
export function QuarterlyPlanAbsenceRow({ group, team }: QuarterlyPlanAbsenceRowProps) {
  const { t } = useI18n();
  const { absenceByMember, weeks } = useQuarterlyPlanBoard();
  const edits = useQuarterAbsenceEdits(team.boardId);
  const [picker, setPicker] = useState<{ anchor: QuarterMenuAnchor; week: number } | null>(null);
  const [menu, setMenu] = useState<{ anchor: QuarterMenuAnchor; eventId: string } | null>(null);

  const kinds: readonly AvailabilityCardKind[] = QUARTER_ABSENCE_ROW_KINDS[group];
  const chips: QuarterAbsenceChip[] = team.members.flatMap((member) =>
    (absenceByMember.get(member.id)?.segments ?? [])
      .filter((segment) => kinds.includes(segment.kind))
      .map((segment) => ({
      days: segment.dayIndices[segment.dayIndices.length - 1]! - segment.startDay + 1,
      id: segment.eventId,
      kind: segment.kind,
      member,
      range: segment.dateRangeLabel,
      startDay: segment.startDay,
    }))
  );
  const { laneById, laneCount } = assignBarLanes(
    chips.map((chip) => ({ id: chip.id, startWeek: chip.startDay, weeks: chip.days }))
  );
  // Плашки считаются в днях: для заметок неделя с плашкой занята на всю высоту плашек,
  // свободная — с самого верха строки.
  const noteBlockers = chips.map((chip) => {
    const startWeek = Math.floor(chip.startDay / QUARTER_WORKING_DAYS_PER_WEEK);
    const lastWeek = Math.floor((chip.startDay + chip.days - 1) / QUARTER_WORKING_DAYS_PER_WEEK);
    return { lane: 0, rows: laneCount, startWeek, weeks: lastWeek - startWeek + 1 };
  });
  const eventOf = (chip: Pick<QuarterAbsenceChip, 'id' | 'member'>) =>
    absenceByMember.get(chip.member.id)?.events.find((event) => event.id === chip.id);

  const menuChip = menu ? chips.find((chip) => chip.id === menu.eventId) : undefined;
  const menuEvent = menuChip ? eventOf(menuChip) : undefined;

  return (
    <QuarterlyPlanRow
      heightPx={quarterRowHeightPx(laneCount)}
      left={
        <span className="truncate px-3 text-xs text-ds-text-muted">
          {t(`quarterlyPlan.absenceRows.${group}`)}
        </span>
      }
      noteBlockers={noteBlockers}
      // Заметки строки отсутствий живут в строке отпусков; у графика дежурств их нет.
      noteRow={group === 'away' ? { id: team.id, kind: 'absence' } : undefined}
      notesTopPx={QUARTER_ROW_PADDING_PX}
      weekActionLabel={t(`quarterlyPlan.absenceWeeks.${group}`)}
      onWeekClick={(week, anchor) => setPicker({ anchor, week })}
    >
      {chips.map((chip) => (
        <QuarterlyPlanAbsenceChip
          key={chip.id}
          chip={chip}
          lane={laneById.get(chip.id) ?? 0}
          onChange={(to) => {
            const event = eventOf(chip);
            if (event) edits.update(event, absenceDatesAfterDrag({ event, from: chip, to, weeks }));
          }}
          onClick={(anchor) => setMenu({ anchor, eventId: chip.id })}
        />
      ))}
      {picker ? (
        <QuarterlyPlanMenu
          anchor={picker.anchor}
          sections={[
            {
              id: 'members',
              label: t(`quarterlyPlan.absencePickMembers.${group}`),
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
                onSelect: () => {
                  const { anchor, week } = picker;
                  // Плашка сразу встаёт на неделю первым видом строки; если видов несколько — следом её меню.
                  edits
                    .create({
                      endDate: weeks[week]!.endDate,
                      eventType: kinds[0]!,
                      memberId: member.id,
                      memberName: member.name,
                      startDate: weeks[week]!.startDate,
                    })
                    .then((created) => created && kinds.length > 1 && setMenu({ anchor, eventId: created.id }))
                    .catch(() => undefined);
                },
              })),
            },
          ]}
          onClose={() => setPicker(null)}
        />
      ) : null}
      {menu && menuChip && menuEvent ? (
        <QuarterlyPlanMenu
          anchor={menu.anchor}
          sections={[
            {
              id: 'kind',
              label: `${menuChip.member.name} · ${menuChip.range}`,
              // В строке одного вида выбирать нечего — остаётся подпись и удаление.
              rows: (kinds.length > 1 ? kinds : []).map((kind) => ({
                checked: kind === menuChip.kind,
                id: kind,
                label: t(availabilityKindMessageKey(kind)),
                onSelect: () => edits.update(menuEvent, { eventType: kind }),
              })),
            },
            {
              id: 'actions',
              rows: [
                {
                  destructive: true,
                  icon: <Icon className="h-4 w-4" name="trash" />,
                  id: 'remove',
                  label: t(`quarterlyPlan.absenceRemoves.${group}`),
                  onSelect: () => edits.remove(menuEvent),
                },
              ],
            },
          ]}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </QuarterlyPlanRow>
  );
}
