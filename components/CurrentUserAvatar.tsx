'use client';

import { Avatar } from '@/components/Avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getInitials } from '@/utils/displayUtils';

/**
 * Аватар и имя текущего пользователя (данные из Tracker GET /myself).
 * Показывается в шапке справа. Пока данных нет — плейсхолдер того же размера, что и `Avatar` lg (без скачка вёрстки).
 */
export function CurrentUserAvatar() {
  const { data: user, isError } = useCurrentUser();

  if (isError) {
    return null;
  }

  if (!user) {
    return (
      <span
        aria-hidden
        className="inline-flex h-8 items-center gap-2"
      >
        <span className="inline-block h-8 w-8 shrink-0 animate-pulse rounded-full border border-gray-400/40 bg-gray-200 dark:border-white/30 dark:bg-gray-600" />
        <span className="hidden h-3 w-24 animate-pulse rounded bg-gray-200 sm:inline-block dark:bg-gray-600" />
      </span>
    );
  }

  const avatarUrl = user.avatarUrl ?? null;
  const initials = getInitials(user.display);

  return (
    <div className="flex min-w-0 max-w-[12rem] items-center gap-2" title={user.display}>
      <Avatar
        avatarUrl={avatarUrl}
        initials={initials}
        initialsVariant="default"
        size="lg"
        title={user.display}
      />
      <span className="hidden truncate text-sm font-medium text-gray-800 sm:inline dark:text-gray-100">
        {user.display}
      </span>
    </div>
  );
}
