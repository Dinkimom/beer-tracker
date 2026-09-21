/**
 * Утилиты для работы с участниками команды.
 * Преобразует данные из PostgreSQL (team_members/staff) в доменный тип Developer.
 */

import type { Developer } from '@/types';
import type { TeamMember } from '@/types/team';

import {
  getRoleBySlug,
  type RoleResolutionSlice,
} from '@/lib/roles/catalog';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

/** Слайсы ролей организации и системные — для резолва team_members.role_slug. */
interface RoleResolutionContext {
  orgRoles: RoleResolutionSlice[];
  systemRoles: RoleResolutionSlice[];
}

/**
 * Мерджит участников команды (из PostgreSQL) с исполнителями из спринта
 *
 * Логика работы:
 * 1. Получаем всех участников команды по board ID
 * 2. Получаем исполнителей из задач спринта
 * 3. Объединяем данные:
 *    - Если у участника команды есть тот же id исполнителя, что и в спринте (tracker_uid или синтетический staff:<staff_id>) — используем данные из team_members
 *    - Если исполнитель есть в спринте, но нет в команде - добавляем его из спринта
 *    - Если участник команды есть, но не является исполнителем в спринте - всё равно добавляем его в список
 *
 * @param teamMembers - Участники команды из team_members/staff
 * @param sprintAssignees - Исполнители из спринта (Developer[])
 * @returns Объединенный список разработчиков
 */
export function mergeTeamMembersWithAssignees(
  teamMembers: TeamMember[],
  sprintAssignees: Developer[],
  roleCtx?: RoleResolutionContext
): Developer[] {
  const developersMap = new Map<string, Developer>();

  teamMembers.forEach((member) => {
    const dev = teamMemberToDeveloper(member, roleCtx);
    if (dev) {
      developersMap.set(dev.id, dev);
    }
  });

  sprintAssignees.forEach((assignee) => {
    if (!developersMap.has(assignee.id)) {
      developersMap.set(assignee.id, assignee);
    }
  });

  return Array.from(developersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ru')
  );
}

/** Префикс id исполнителя в планере для staff без привязки к пользователю Трекера (совпадает с task_positions.assignee_id). */
export const STAFF_SWIMLANE_ASSIGNEE_PREFIX = 'staff:' as const;

/** Для таких id позиции в планере сохраняются, но исполнитель в API Трекера не обновляется. */
export function shouldSyncAssigneeIdToTracker(assigneeId: string): boolean {
  return (
    !assigneeId.startsWith(STAFF_SWIMLANE_ASSIGNEE_PREFIX) &&
    !isTeamSwimlaneAssigneeId(assigneeId)
  );
}

function assigneeIdFromTeamMember(member: TeamMember): string | null {
  const tracker = member.tracker_uid?.trim();
  if (tracker) {
    return tracker;
  }
  const uid = member.uid?.trim();
  if (!uid) {
    return null;
  }
  return `${STAFF_SWIMLANE_ASSIGNEE_PREFIX}${uid}`;
}

function displayNameForTeamMember(member: TeamMember, fallbackId: string): string {
  const fromDisplay = member.displayName?.trim();
  if (fromDisplay) {
    return fromDisplay;
  }
  const fromEmail = member.email?.trim();
  if (fromEmail) {
    return fromEmail;
  }
  const fromLogin = member.login?.trim();
  if (fromLogin) {
    return fromLogin;
  }
  return fallbackId;
}

/** TeamMember → Developer (id = tracker_uid или staff:<staff_id>) */
function teamMemberToDeveloper(
  member: TeamMember,
  roleCtx?: RoleResolutionContext
): Developer | null {
  const id = assigneeIdFromTeamMember(member);
  if (!id) {
    return null;
  }

  const resolved = getRoleBySlug(
    member.role?.slug,
    roleCtx?.systemRoles,
    roleCtx?.orgRoles
  );
  const role = resolved.domainRole;
  const platforms =
    role === 'developer' && resolved.platforms.length > 0
      ? resolved.platforms
      : undefined;
  const roleTitle = resolved.title || member.role?.title || undefined;

  return {
    id,
    name: displayNameForTeamMember(member, id),
    avatarUrl: member.avatarUrl ?? undefined,
    email: member.email?.trim().toLowerCase() || undefined,
    role,
    platforms,
    roleTitle,
  };
}

/**
 * Конвертирует TeamMember в Developer
 */
export function convertTeamMemberToDeveloper(
  member: TeamMember,
  roleCtx?: RoleResolutionContext
): Developer | null {
  return teamMemberToDeveloper(member, roleCtx);
}

/**
 * Конвертирует массив TeamMember в массив Developer
 */
export function convertTeamMembersToDevelopers(
  members: TeamMember[],
  roleCtx?: RoleResolutionContext
): Developer[] {
  return members
    .map((m) => convertTeamMemberToDeveloper(m, roleCtx))
    .filter((dev): dev is Developer => dev !== null);
}
