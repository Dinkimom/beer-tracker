import type { QuarterlyPlanMenuRow, QuarterlyPlanMenuSection } from './components/QuarterlyPlanMenu';
import type {
  QuarterlyPlanDraft,
  QuarterMenuAnchor,
  QuarterlyPlanRowTarget,
} from './QuarterlyPlanBoardContext';
import type { MemberAbsence } from './quarterlyPlanBoardModel';
import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterlyPlanEpicStatus,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';
import type { Developer } from '@/types';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusTag } from '@/components/StatusTag';
import {
  absentDaysWithinSpan,
  addAssignment,
  buildWeekLoad,
  removeAssignment,
  updateAssignment,
  updateEpic,
  type WeekSpan,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import {
  formatSpanRange,
  QUARTER_STATUS_ORDER,
  QUARTER_STATUS_PALETTE_KEY,
} from './quarterlyPlanBoardModel';

export type QuarterlyPlanMenuState =
  { anchor: QuarterMenuAnchor; assignmentId: string; kind: 'bar' } | { anchor: QuarterMenuAnchor; epicId: string; kind: 'assign'; week: number; weeks: number } | { anchor: QuarterMenuAnchor; epicId: string; kind: 'status' } | { anchor: QuarterMenuAnchor; kind: 'row'; target: QuarterlyPlanRowTarget };

/** Зачем открыт поиск по трекеру: добавить строку из трекера или привязать уже заведённую. */
export type QuarterlyPlanTrackerPick =
  | { directionId: string; kind: 'add' }
  | { epicId: string; kind: 'link' };

/** Действия строк, у которых есть своё состояние на странице: поле ввода, диалог, запрос в трекер. */
export interface QuarterlyPlanRowActions {
  /** Открыть выбор ещё одного человека на те же недели, что у полосы. */
  onAssignMore: (epicId: string, span: WeekSpan) => void;
  onPickTrackerEpic: (purpose: QuarterlyPlanTrackerPick) => void;
  onRemoveDirection: (directionId: string) => void;
  onRemoveEpic: (epicId: string) => void;
  onStartDraft: (draft: QuarterlyPlanDraft) => void;
  /** Начать связь от этой полосы: следующим кликом выбирают вторую. */
  onStartLink: (assignmentId: string) => void;
}

interface MenuSectionsInput {
  absenceByMember: ReadonlyMap<string, MemberAbsence>;
  actions: QuarterlyPlanRowActions;
  menu: QuarterlyPlanMenuState;
  plan: QuarterlyPlan;
  weeks: readonly QuarterWeek[];
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
  t: (key: string, params?: Record<string, number | string>) => string;
}

function memberAvatar(member: Developer) {
  return (
    <Avatar
      avatarUrl={member.avatarUrl}
      initials={member.name.charAt(0).toUpperCase()}
      initialsVariant={getAvatarVariantForDeveloper(member)}
      size="2xs"
    />
  );
}

/** Команда, которой принадлежит эпик: исполнителей предлагаем из неё. */
function teamMembersOfEpic(plan: QuarterlyPlan, epicId: string): Developer[] {
  const directionId = plan.epics.find((epic) => epic.id === epicId)?.directionId;
  const teamId = plan.directions.find((direction) => direction.id === directionId)?.teamId;
  return plan.teams.find((team) => team.id === teamId)?.members ?? [];
}

/** Заголовок меню со сроком: видно, про какие недели выбор. */
function withRange(input: MenuSectionsInput, label: string, span: { startWeek: number; weeks: number }): string {
  return `${label} · ${formatSpanRange(input.weeks, span)}`;
}

/** Пометка у человека в меню назначения: в эти недели он отсутствует или уже занят. */
function spanHint(input: MenuSectionsInput, memberId: string, span: WeekSpan): string | undefined {
  const blocked = input.absenceByMember.get(memberId)?.blockedDays ?? new Set<number>();
  if (absentDaysWithinSpan(span, blocked).length > 0) return input.t('quarterlyPlan.memberAway');
  const load = buildWeekLoad(
    input.plan.assignments.filter((assignment) => assignment.memberId === memberId),
    input.weeks.length
  );
  const busy = load.slice(span.startWeek, span.startWeek + span.weeks).some((count) => count > 0);
  return busy ? input.t('quarterlyPlan.memberBusy') : undefined;
}

/** Выбор человека на срок `span`; тех, кто уже стоит на этом эпике в эти недели, не предлагаем. */
function assignSections(input: MenuSectionsInput, epicId: string, span: WeekSpan): QuarterlyPlanMenuSection[] {
  const taken = new Set(
    input.plan.assignments
      .filter(
        (assignment) =>
          assignment.epicId === epicId &&
          assignment.startWeek < span.startWeek + span.weeks &&
          assignment.startWeek + assignment.weeks > span.startWeek
      )
      .map((assignment) => assignment.memberId)
  );
  const rows: QuarterlyPlanMenuRow[] = teamMembersOfEpic(input.plan, epicId)
    .filter((member) => !taken.has(member.id))
    .map((member) => ({
      hint: spanHint(input, member.id, span),
      icon: memberAvatar(member),
      id: member.id,
      label: member.name,
      onSelect: () =>
        input.applyEdit((content) =>
          addAssignment(content, { id: crypto.randomUUID(), epicId, memberId: member.id, ...span })
        ),
    }));
  return [{ id: 'assign', label: withRange(input, input.t('quarterlyPlan.menuAssign'), span), rows }];
}

function barSections(input: MenuSectionsInput, assignmentId: string): QuarterlyPlanMenuSection[] {
  const assignment = input.plan.assignments.find((epic) => epic.id === assignmentId);
  if (!assignment) return [];
  const members: QuarterlyPlanMenuRow[] = teamMembersOfEpic(input.plan, assignment.epicId).map(
    (member) => ({
      checked: member.id === assignment.memberId,
      icon: memberAvatar(member),
      id: member.id,
      label: member.name,
      onSelect: () =>
        input.applyEdit((content) => updateAssignment(content, assignmentId, { memberId: member.id })),
    })
  );
  return [
    { id: 'reassign', label: withRange(input, input.t('quarterlyPlan.menuAssignee'), assignment), rows: members },
    {
      id: 'actions',
      rows: [
        {
          icon: rowIcon('plus'),
          id: 'more',
          keepOpen: true,
          label: input.t('quarterlyPlan.menuAddPerson'),
          onSelect: () => input.actions.onAssignMore(assignment.epicId, assignment),
        },
        {
          icon: rowIcon('arrow-right'),
          id: 'link',
          label: input.t('quarterlyPlan.menuLink'),
          onSelect: () => input.actions.onStartLink(assignmentId),
        },
        {
          destructive: true,
          icon: rowIcon('trash'),
          id: 'delete',
          label: input.t('quarterlyPlan.menuRemove'),
          onSelect: () => input.applyEdit((content) => removeAssignment(content, assignmentId)),
        },
      ],
    },
  ];
}

function statusSections(input: MenuSectionsInput, epicId: string): QuarterlyPlanMenuSection[] {
  const current = input.plan.epics.find((epic) => epic.id === epicId)?.status;
  const rows: QuarterlyPlanMenuRow[] = QUARTER_STATUS_ORDER.map((status: QuarterlyPlanEpicStatus) => ({
    checked: status === current,
    // Тот же цветной тег, что в строке эпика: статус узнаётся по цвету.
    icon: (
      <StatusTag
        label={input.t(`quarterlyPlan.status.${status}`)}
        status={QUARTER_STATUS_PALETTE_KEY[status]}
      />
    ),
    id: status,
    label: '',
    onSelect: () => input.applyEdit((content) => updateEpic(content, epicId, { status })),
  }));
  return [{ id: 'status', label: input.t('quarterlyPlan.menuStatus'), rows }];
}

function rowIcon(name: string) {
  return <Icon className="h-4 w-4 shrink-0" name={name} />;
}

function addEpicSections(input: MenuSectionsInput, directionId: string): QuarterlyPlanMenuSection[] {
  const { actions, t } = input;
  return [
    {
      id: 'add',
      rows: [
        {
          icon: rowIcon('plus'),
          id: 'new',
          label: t('quarterlyPlan.menuNewEpic'),
          onSelect: () => actions.onStartDraft({ directionId, kind: 'newEpic' }),
        },
        {
          icon: rowIcon('link'),
          id: 'tracker',
          label: t('quarterlyPlan.menuEpicFromTracker'),
          onSelect: () => actions.onPickTrackerEpic({ directionId, kind: 'add' }),
        },
      ],
    },
  ];
}

function directionSections(input: MenuSectionsInput, directionId: string): QuarterlyPlanMenuSection[] {
  const { actions, t } = input;
  return [
    {
      id: 'edit',
      rows: [
        {
          icon: rowIcon('edit'),
          id: 'rename',
          label: t('quarterlyPlan.menuRename'),
          onSelect: () => actions.onStartDraft({ id: directionId, kind: 'renameDirection' }),
        },
      ],
    },
    {
      id: 'danger',
      rows: [
        {
          destructive: true,
          icon: rowIcon('trash'),
          id: 'delete',
          label: t('quarterlyPlan.menuRemoveDirection'),
          onSelect: () => actions.onRemoveDirection(directionId),
        },
      ],
    },
  ];
}

function epicSections(input: MenuSectionsInput, epicId: string): QuarterlyPlanMenuSection[] {
  const { actions, applyEdit, plan, t } = input;
  const linked = Boolean(plan.epics.find((epic) => epic.id === epicId)?.issueKey);
  const tracker: QuarterlyPlanMenuRow = linked
    ? {
        icon: rowIcon('x'),
        id: 'unlink',
        label: t('quarterlyPlan.menuUnlink'),
        onSelect: () => applyEdit((content) => updateEpic(content, epicId, { issueKey: undefined })),
      }
    : {
        icon: rowIcon('link'),
        id: 'link',
        label: t('quarterlyPlan.menuLinkEpic'),
        onSelect: () => actions.onPickTrackerEpic({ epicId, kind: 'link' }),
      };
  return [
    {
      id: 'edit',
      rows: [
        {
          icon: rowIcon('edit'),
          id: 'rename',
          label: t('quarterlyPlan.menuRename'),
          onSelect: () => actions.onStartDraft({ id: epicId, kind: 'renameEpic' }),
        },
        tracker,
      ],
    },
    {
      id: 'danger',
      rows: [
        {
          destructive: true,
          icon: rowIcon('trash'),
          id: 'delete',
          label: t('quarterlyPlan.menuRemove'),
          onSelect: () => actions.onRemoveEpic(epicId),
        },
      ],
    },
  ];
}

function rowSections(input: MenuSectionsInput, target: QuarterlyPlanRowTarget): QuarterlyPlanMenuSection[] {
  if (target.kind === 'addEpic') return addEpicSections(input, target.id);
  if (target.kind === 'direction') return directionSections(input, target.id);
  return epicSections(input, target.id);
}

export function buildQuarterlyPlanMenuSections(input: MenuSectionsInput): QuarterlyPlanMenuSection[] {
  const { menu } = input;
  if (menu.kind === 'assign') {
    return assignSections(input, menu.epicId, { startWeek: menu.week, weeks: menu.weeks });
  }
  if (menu.kind === 'bar') return barSections(input, menu.assignmentId);
  if (menu.kind === 'row') return rowSections(input, menu.target);
  return statusSections(input, menu.epicId);
}
