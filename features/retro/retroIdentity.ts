import type { TrackerMyselfUser } from '@/lib/api/types';
import type { RetroCardComment, RetroCommentAuthor, RetroReactionActor } from '@/lib/retro/retroBoard';

import { useMemo } from 'react';

import { useDemoPlannerShell } from '@/contexts/DemoPlannerShellContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { DEMO_DEV_DISPLAY } from '@/lib/demo/demoFixtureSeedTasks';
import { DEMO_DEV_ALICE } from '@/lib/demo/demoIds';

/** Кто правит доску ретро: автор заметок и комментариев и кто ставит реакции — один человек. */
export interface RetroIdentity {
  /** `null` — пользователь ещё не загружен: реакцию поставить нельзя. */
  actor: RetroReactionActor | null;
  author: RetroCommentAuthor;
}

function displayName(user: TrackerMyselfUser): string {
  return user.display?.trim() || user.login?.trim() || user.email?.trim() || '';
}

/**
 * В демо сессии трекера нет — правит фикстурный участник; иначе текущий пользователь трекера.
 * Раньше автор заметки, комментария и реакции считались в трёх местах по-разному, и в демо
 * реакции молча не ставились.
 */
export function resolveRetroIdentity(user: TrackerMyselfUser | undefined, isDemoPlanner: boolean): RetroIdentity {
  if (isDemoPlanner) {
    const { avatarUrl, name } = DEMO_DEV_DISPLAY.alice;
    return { actor: { userId: DEMO_DEV_ALICE, userName: name }, author: { avatarUrl, name, userId: DEMO_DEV_ALICE } };
  }
  if (!user) {
    return { actor: null, author: { avatarUrl: null, name: '' } };
  }
  const userId = String(user.uid);
  const name = displayName(user);
  return { actor: { userId, userName: name }, author: { avatarUrl: user.avatarUrl ?? null, name, userId } };
}

export function useRetroIdentity(): RetroIdentity {
  const { data: user } = useCurrentUser();
  const { isDemoPlanner } = useDemoPlannerShell();
  return useMemo(() => resolveRetroIdentity(user, isDemoPlanner), [isDemoPlanner, user]);
}

/** Свой комментарий: по id автора, у старых без id — по имени. */
export function isOwnRetroComment(comment: RetroCardComment, me: RetroCommentAuthor | null): boolean {
  if (!me?.userId && !me?.name) return false;
  if (comment.authorId) return comment.authorId === me.userId;
  return me.name.length > 0 && comment.authorName === me.name;
}
