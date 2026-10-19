'use client';

import type { RegistryUserItem } from '@/lib/api/types';

import { useCallback, useMemo } from 'react';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { UserSelector } from '@/features/sprint/components/SprintPlanner/components/UserSelector';
import { searchAdminOrgUsers } from '@/lib/api/admin/tracker';

interface AdminTeamMembersTrackerPickerProps {
  addTrackerMeta: { displayName?: string; email?: string | null } | null;
  addTrackerUserId: string;
  orgId: string;
  setAddTrackerMeta: (v: { displayName?: string; email?: string | null } | null) => void;
  setAddTrackerUserId: (v: string) => void;
}

export function AdminTeamMembersTrackerPicker({
  addTrackerMeta,
  addTrackerUserId,
  orgId,
  setAddTrackerMeta,
  setAddTrackerUserId,
}: AdminTeamMembersTrackerPickerProps) {
  const { t } = useI18n();
  const searchTrackerUsers = useCallback(
    (query: string, signal?: AbortSignal) => searchAdminOrgUsers(orgId, query, signal),
    [orgId]
  );
  const selectedPreview = useMemo((): RegistryUserItem | null => {
    const trackerId = addTrackerUserId.trim();
    if (!trackerId) return null;
    return {
      displayName: addTrackerMeta?.displayName?.trim() || trackerId,
      email: addTrackerMeta?.email ?? null,
      trackerId,
    };
  }, [addTrackerMeta, addTrackerUserId]);

  return (
    <UserSelector
      allowClear
      menuZIndex={ZIndex.modal + 1}
      placeholder={t('admin.teamMembers.trackerSearchPlaceholder')}
      searchFn={searchTrackerUsers}
      selectedPreview={selectedPreview}
      title={t('admin.teamMembers.trackerUserTitle')}
      value={addTrackerUserId}
      onChange={(trackerId, user) => {
        setAddTrackerUserId(trackerId);
        setAddTrackerMeta(
          user
            ? {
                displayName: user.displayName,
                email: user.email?.trim() || null,
              }
            : null
        );
      }}
    />
  );
}
