'use client';

import type { AdminTeamMember } from '@/features/admin/adminTeamCatalog';

import { Avatar } from '@/components/Avatar';
import { muted } from '@/features/admin/adminUiTokens';
import { getInitials } from '@/utils/displayUtils';

export function AdminTeamMemberRowIdentity({
  member,
  showPlannerHint,
  t,
}: {
  member: AdminTeamMember;
  showPlannerHint: boolean;
  t: (key: string) => string;
}) {
  const displayName = member.staff_display_name?.trim() || t('admin.teamMemberRow.noEmail');

  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar
        avatarUrl={member.staff_avatar_url}
        className="mt-0.5"
        initials={getInitials(displayName)}
        size="lg"
        title={displayName}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {member.staff_display_name}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {member.staff_email ? (
            <span className="max-w-full truncate text-gray-500 dark:text-gray-400">
              {member.staff_email}
            </span>
          ) : (
            <span className={muted}>{t('admin.teamMemberRow.noEmail')}</span>
          )}
        </div>
        {showPlannerHint ? (
          <p
            className="line-clamp-2 text-[11px] leading-snug text-amber-800 dark:text-amber-200/90"
            title={t('admin.teamMemberRow.noPlannerAccessTitle')}
          >
            {t('admin.teamMemberRow.noPlannerAccess')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
