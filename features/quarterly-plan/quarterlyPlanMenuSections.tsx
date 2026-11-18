import type { QuarterlyPlanMenuRow, QuarterlyPlanMenuSection } from './components/QuarterlyPlanMenu';
import type {
  QuarterlyPlanAssignRow,
  QuarterlyPlanDraft,
  QuarterMenuAnchor,
  QuarterlyPlanRowTarget,
} from './QuarterlyPlanBoardContext';
import type { MemberAbsence } from './quarterlyPlanBoardModel';
import type {
  QuarterlyPlan,
  QuarterlyPlanAssignment,
  QuarterlyPlanContent,
  QuarterlyPlanEpicStatus,
  QuarterlyPlanPhase,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';
import type { Developer } from '@/types';

import { Avatar, getAvatarVariantForDeveloper } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusTag } from '@/components/StatusTag';
import {
  absentDaysWithinSpan,
  addAssignment,
  addEpic,
  assignmentPhase,
  assignmentSpanFields,
  buildWeekLoad,
  daySpanOf,
  type DaySpan,
  directionIdOfAssignment,
  QUARTER_MAX_PARALLEL_EPICS,
  removeAssignment,
  updateAssignment,
  updateDirection,
  updateEpic,
  type WeekSpan,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { collectSprintDrifts, type QuarterlyPlanSprintDrift } from '@/lib/quarterlyPlans/quarterlyPlanSprintSync';
import { randomUuid } from '@/lib/randomUuid';

import {
  formatDateRange,
  formatSpanRange,
  QUARTER_STATUS_ORDER,
  QUARTER_STATUS_PALETTE_KEY,
} from './quarterlyPlanBoardModel';

export type QuarterlyPlanMenuState =
  { anchor: QuarterMenuAnchor; assignmentId: string; kind: 'bar' } | { anchor: QuarterMenuAnchor; days?: number; kind: 'assign'; phase?: QuarterlyPlanPhase; row: QuarterlyPlanAssignRow; startDay?: number; week: number; weeks: number } | { anchor: QuarterMenuAnchor; epicId: string; kind: 'sprintDrift' } | { anchor: QuarterMenuAnchor; epicId: string; kind: 'status' } | { anchor: QuarterMenuAnchor; kind: 'row'; target: QuarterlyPlanRowTarget };

/**
 * Зачем открыт поиск по трекеру: добавить эпик плана или задачу эпика (`parentEpicId`) из задачи трекера,
 * привязать эпик плана к задаче или направление — к эпику трекера.
 */
export type QuarterlyPlanTrackerPick =
  | { directionId: string; kind: 'add'; parentEpicId?: string }
  | { directionId: string; kind: 'linkDirection' }
  | { epicId: string; kind: 'link' };

/** Доска команды, к которой относится строка: по ней ищем в трекере. */
export function trackerPickBoardId(plan: QuarterlyPlan, pick: QuarterlyPlanTrackerPick): number {
  const directionId = pick.kind === 'link' ? plan.epics.find((epic) => epic.id === pick.epicId)?.directionId : pick.directionId;
  const teamId = plan.directions.find((direction) => direction.id === directionId)?.teamId;
  return plan.teams.find((team) => team.id === teamId)?.boardId ?? 0;
}

/** Выбранное в трекере ложится в план: новый эпик плана, привязка эпика или направления. */
export function applyTrackerPickToPlan(
  content: QuarterlyPlanContent,
  pick: QuarterlyPlanTrackerPick,
  issue: { issueKey: string; title: string }
): QuarterlyPlanContent {
  if (pick.kind === 'linkDirection') return updateDirection(content, pick.directionId, issue);
  if (pick.kind === 'link') return updateEpic(content, pick.epicId, issue);
  const { directionId, parentEpicId } = pick;
  return addEpic(content, {
    directionId,
    id: randomUuid(),
    ...issue,
    ...(parentEpicId ? { parentEpicId } : {}),
    status: 'backlog',
  });
}

/** Действия строк, у которых есть своё состояние на странице: поле ввода, диалог, запрос в трекер. */
export interface QuarterlyPlanRowActions {
  /** Открыть выбор ещё одного человека на те же недели, строку и фазу, что у полосы. */
  onAssignMore: (assignment: QuarterlyPlanAssignment) => void;
  /** В меню назначения выбрали фазу новой полосы: меню остаётся открытым, выбор человека — следом. */
  onAssignPhase: (phase: QuarterlyPlanPhase) => void;
  /** Синхронизация со спринтом по задачам строки (QK9). */
  onOpenSprintSync: (rowId: string) => void;
  onPickTrackerEpic: (purpose: QuarterlyPlanTrackerPick) => void;
  onRemoveDirection: (directionId: string) => void;
  onRemoveEpic: (epicId: string) => void;
  onStartDraft: (draft: QuarterlyPlanDraft) => void;
  /** Начать связь от этой полосы: следующим кликом выбирают вторую. */
  onStartLink: (assignmentId: string) => void;
  /** Синхронизировать одну задачу в выбранную сторону (QK9). */
  onSyncDrift: (drift: QuarterlyPlanSprintDrift, to: 'plan' | 'sprint') => void;
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

/** Строка назначения в форме плана: эпик или направление (QG2). */
function rowFields(row: QuarterlyPlanAssignRow): Pick<QuarterlyPlanAssignment, 'directionId' | 'epicId'> {
  return row.kind === 'epic' ? { epicId: row.id } : { directionId: row.id };
}

/** Фаза в плане: discovery хранится, delivery — отсутствием поля (QG1). */
function phaseFields(phase: QuarterlyPlanPhase): Pick<QuarterlyPlanAssignment, 'phase'> {
  return { phase: phase === 'discovery' ? 'discovery' : undefined };
}

/** Команда, которой принадлежит строка: исполнителей предлагаем из неё (QA3). */
function teamMembersOfRow(plan: QuarterlyPlan, row: Pick<QuarterlyPlanAssignment, 'directionId' | 'epicId'>): Developer[] {
  const directionId = directionIdOfAssignment(plan, row);
  const teamId = plan.directions.find((direction) => direction.id === directionId)?.teamId;
  return plan.teams.find((team) => team.id === teamId)?.members ?? [];
}

/** Заголовок меню со сроком: видно, про какие недели выбор. */
function withRange(
  input: MenuSectionsInput,
  label: string,
  span: { days?: number; startDay?: number; startWeek: number; weeks: number }
): string {
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
  // Ещё одна полоса — уже больше нормы параллельных эпиков (QI2).
  const busy = load.slice(span.startWeek, span.startWeek + span.weeks).some((count) => count >= QUARTER_MAX_PARALLEL_EPICS);
  return busy ? input.t('quarterlyPlan.memberBusy') : undefined;
}

/**
 * Выбор человека на срок `span`; тех, кто уже стоит в этой строке в эти недели, не предлагаем.
 * Фаза новой полосы: в строке направления — discovery, в строке эпика — delivery (QG2); её можно сменить
 * переключателем над списком людей — поставку ставят и на само направление, не разбивая его на эпики.
 */
function assignSections(
  input: MenuSectionsInput,
  row: QuarterlyPlanAssignRow,
  span: Partial<DaySpan> & WeekSpan,
  phase: QuarterlyPlanPhase = row.kind === 'direction' ? 'discovery' : 'delivery'
): QuarterlyPlanMenuSection[] {
  const fields = rowFields(row);
  // Полоса встаёт на дни клетки (свободные дни недели) или на дни полосы, к которой добавляют человека (QT5).
  const days = daySpanOf(span);
  const taken = new Set(
    input.plan.assignments
      .filter((assignment) => {
        const other = daySpanOf(assignment);
        return (
          assignment.epicId === fields.epicId &&
          assignment.directionId === fields.directionId &&
          other.startDay < days.startDay + days.days &&
          other.startDay + other.days > days.startDay
        );
      })
      .map((assignment) => assignment.memberId)
  );
  const rows: QuarterlyPlanMenuRow[] = teamMembersOfRow(input.plan, fields)
    .filter((member) => !taken.has(member.id))
    .map((member) => ({
      hint: spanHint(input, member.id, span),
      icon: memberAvatar(member),
      id: member.id,
      label: member.name,
      onSelect: () =>
        input.applyEdit((content) =>
          addAssignment(content, {
            ...fields,
            id: randomUuid(),
            memberId: member.id,
            ...(phase === 'discovery' ? phaseFields(phase) : {}),
            ...assignmentSpanFields(days),
          })
        ),
    }));
  const phases: QuarterlyPlanMenuRow[] = (['discovery', 'delivery'] as const).map((value) => ({
    checked: value === phase,
    id: `phase-${value}`,
    keepOpen: true,
    label: input.t(`quarterlyPlan.phase.${value}`),
    onSelect: () => input.actions.onAssignPhase(value),
  }));
  return [
    { id: 'phase', label: input.t('quarterlyPlan.menuPhase'), rows: phases },
    { id: 'assign', label: withRange(input, input.t('quarterlyPlan.menuAssign'), span), rows },
  ];
}

function barSections(input: MenuSectionsInput, assignmentId: string): QuarterlyPlanMenuSection[] {
  const assignment = input.plan.assignments.find((epic) => epic.id === assignmentId);
  if (!assignment) return [];
  const members: QuarterlyPlanMenuRow[] = teamMembersOfRow(input.plan, assignment).map(
    (member) => ({
      checked: member.id === assignment.memberId,
      icon: memberAvatar(member),
      id: member.id,
      label: member.name,
      onSelect: () =>
        input.applyEdit((content) => updateAssignment(content, assignmentId, { memberId: member.id })),
    })
  );
  const phases: QuarterlyPlanMenuRow[] = (['discovery', 'delivery'] as const).map((phase) => ({
    checked: assignmentPhase(assignment) === phase,
    id: phase,
    label: input.t(`quarterlyPlan.phase.${phase}`),
    onSelect: () => input.applyEdit((content) => updateAssignment(content, assignmentId, phaseFields(phase))),
  }));
  return [
    { id: 'reassign', label: withRange(input, input.t('quarterlyPlan.menuAssignee'), assignment), rows: members },
    { id: 'phase', label: input.t('quarterlyPlan.menuPhase'), rows: phases },
    {
      id: 'actions',
      rows: [
        {
          icon: rowIcon('plus'),
          id: 'more',
          keepOpen: true,
          label: input.t('quarterlyPlan.menuAddPerson'),
          onSelect: () => input.actions.onAssignMore(assignment),
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

/** Меню «+»: новая строка в направлении или задача под эпиком (`parentEpicId`) — своя или из трекера. */
function addEpicSections(
  input: MenuSectionsInput,
  parent: { directionId: string; parentEpicId?: string }
): QuarterlyPlanMenuSection[] {
  const { actions, t } = input;
  return [
    {
      id: 'add',
      rows: [
        {
          icon: rowIcon('plus'),
          id: 'new',
          label: t(parent.parentEpicId ? 'quarterlyPlan.menuNewTask' : 'quarterlyPlan.menuNewEpic'),
          onSelect: () => actions.onStartDraft({ ...parent, kind: 'newEpic' }),
        },
        {
          icon: rowIcon('link'),
          id: 'tracker',
          label: t('quarterlyPlan.menuEpicFromTracker'),
          onSelect: () => actions.onPickTrackerEpic({ ...parent, kind: 'add' }),
        },
      ],
    },
  ];
}

function directionSections(input: MenuSectionsInput, directionId: string): QuarterlyPlanMenuSection[] {
  const { actions, applyEdit, plan, t } = input;
  const direction = plan.directions.find((row) => row.id === directionId);
  const linked = Boolean(direction?.issueKey);
  const tracker: QuarterlyPlanMenuRow = linked
    ? {
        icon: rowIcon('x'),
        id: 'unlink',
        label: t('quarterlyPlan.menuUnlink'),
        onSelect: () => applyEdit((content) => updateDirection(content, directionId, { issueKey: undefined })),
      }
    : {
        icon: rowIcon('link'),
        id: 'link',
        label: t('quarterlyPlan.menuLinkDirection'),
        onSelect: () => actions.onPickTrackerEpic({ directionId, kind: 'linkDirection' }),
      };
  // Название привязанного направления — из трекера (QE5): переименовывают его там.
  const rename: QuarterlyPlanMenuRow = {
    icon: rowIcon('edit'),
    id: 'rename',
    label: t('quarterlyPlan.menuRename'),
    onSelect: () => actions.onStartDraft({ id: directionId, kind: 'renameDirection' }),
  };
  return [
    {
      id: 'edit',
      rows: linked ? [tracker] : [rename, tracker],
    },
    {
      id: 'add',
      rows: [
        {
          icon: rowIcon('plus'),
          id: 'below',
          label: t('quarterlyPlan.menuAddDirectionBelow'),
          onSelect: () =>
            actions.onStartDraft({ afterId: directionId, kind: 'newDirection', teamId: direction?.teamId ?? '' }),
        },
      ],
    },
    ...syncSections(input, directionId),
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

/**
 * Поповер расхождения одной задачи (QK9): где она в спринте и два действия — сдвинуть карточку по плану или
 * поставить полосу на дни спринта. Сторона, которую нельзя применить, показывает причину вместо действия.
 */
function sprintDriftSections(input: MenuSectionsInput, epicId: string): QuarterlyPlanMenuSection[] {
  const [drift] = collectSprintDrifts(input.plan, input.weeks, new Set([epicId]));
  if (!drift) return [];
  const { t } = input;
  const row = (to: 'plan' | 'sprint'): QuarterlyPlanMenuRow => {
    const target = to === 'sprint' ? drift.toSprint : drift.toPlan;
    const range = to === 'sprint' ? drift.plan : drift.sprint;
    const blocked = 'blocker' in target;
    return {
      hint: blocked ? t(`quarterlyPlan.sync.blockerShort.${target.blocker}`) : undefined,
      icon: rowIcon(to === 'sprint' ? 'arrow-right' : 'calendar'),
      id: to,
      // Сторону нельзя применить: пункт приглушён, причина — в пометке.
      disabled: blocked,
      label: t(to === 'sprint' ? 'quarterlyPlan.sync.moveCard' : 'quarterlyPlan.sync.takeSprint', {
        range: formatDateRange(range.startDate, range.endDate),
      }),
      onSelect: () => input.actions.onSyncDrift(drift, to),
    };
  };
  return [
    {
      id: 'drift',
      label: t('quarterlyPlan.sync.driftLabel', {
        range: formatDateRange(drift.sprint.startDate, drift.sprint.endDate),
        sprint: drift.sprint.sprintName,
      }),
      rows: [row('sprint'), row('plan')],
    },
  ];
}

/** Пункт «Синхронизировать со спринтом» — только если у задач строки есть расхождения (QK9). */
function syncSections(input: MenuSectionsInput, rowId: string): QuarterlyPlanMenuSection[] {
  const count = collectSprintDrifts(input.plan, input.weeks, new Set([rowId])).length;
  if (count === 0) return [];
  return [
    {
      id: 'sync',
      rows: [
        {
          icon: rowIcon('refresh'),
          id: 'sync',
          label: input.t('quarterlyPlan.sync.menu', { count }),
          onSelect: () => input.actions.onOpenSprintSync(rowId),
        },
      ],
    },
  ];
}

function epicSections(input: MenuSectionsInput, epicId: string): QuarterlyPlanMenuSection[] {
  const { actions, applyEdit, plan, t } = input;
  const epic = plan.epics.find((row) => row.id === epicId);
  if (!epic) return [];
  const linked = Boolean(epic.issueKey);
  const { directionId, parentEpicId } = epic;
  const tracker: QuarterlyPlanMenuRow = linked
    ? {
        icon: rowIcon('x'),
        id: 'unlink',
        label: t('quarterlyPlan.menuUnlink'),
        // Отвязанная строка снова ставит статус руками и начинает с «Бэклога» (QE7).
        onSelect: () => applyEdit((content) => updateEpic(content, epicId, { issueKey: undefined, status: 'backlog' })),
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
      // Название привязанного эпика — из трекера (QE5): переименовывают его там.
      rows: [
        ...(linked
          ? []
          : [
              {
                icon: rowIcon('edit'),
                id: 'rename',
                label: t('quarterlyPlan.menuRename'),
                onSelect: () => actions.onStartDraft({ id: epicId, kind: 'renameEpic' }),
              },
            ]),
        tracker,
      ],
    },
    {
      id: 'add',
      rows: [
        {
          icon: rowIcon('plus'),
          id: 'below',
          label: t(parentEpicId ? 'quarterlyPlan.menuAddTaskBelow' : 'quarterlyPlan.menuAddEpicBelow'),
          onSelect: () =>
            actions.onStartDraft({ afterId: epicId, directionId, kind: 'newEpic', ...(parentEpicId ? { parentEpicId } : {}) }),
        },
      ],
    },
    ...syncSections(input, epicId),
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
  if (target.kind === 'addEpic') return addEpicSections(input, { directionId: target.id });
  if (target.kind === 'addTask') {
    const directionId = input.plan.epics.find((epic) => epic.id === target.id)?.directionId ?? '';
    return addEpicSections(input, { directionId, parentEpicId: target.id });
  }
  if (target.kind === 'direction') return directionSections(input, target.id);
  return epicSections(input, target.id);
}

export function buildQuarterlyPlanMenuSections(input: MenuSectionsInput): QuarterlyPlanMenuSection[] {
  const { menu } = input;
  if (menu.kind === 'assign') {
    const { days, startDay } = menu;
    return assignSections(input, menu.row, { days, startDay, startWeek: menu.week, weeks: menu.weeks }, menu.phase);
  }
  if (menu.kind === 'bar') return barSections(input, menu.assignmentId);
  if (menu.kind === 'row') return rowSections(input, menu.target);
  if (menu.kind === 'sprintDrift') return sprintDriftSections(input, menu.epicId);
  return statusSections(input, menu.epicId);
}
