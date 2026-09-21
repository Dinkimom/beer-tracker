'use client';

import type { RegistryUserItem } from '@/lib/api/types';

import { useCallback, useMemo } from 'react';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { UserSelector } from '@/features/sprint/components/SprintPlanner/components/UserSelector';
import { searchAdminTeamRegistry } from '@/lib/api/admin/teams';

interface AdminTeamMembersUserPickerProps {
  addStaffMeta: { displayName?: string; email?: string | null } | null;
  addStaffUid: string;
  orgId: string;
  teamId: string;
  setAddStaffMeta: (v: { displayName?: string; email?: string | null } | null) => void;
  setAddStaffUid: (v: string) => void;
}

export function AdminTeamMembersUserPicker({
  addStaffMeta,
  addStaffUid,
  orgId,
  setAddStaffMeta,
  setAddStaffUid,
  teamId,
}: AdminTeamMembersUserPickerProps) {
  const { t } = useI18n();
  const searchRegistry = useCallback(
    async (query: string, signal?: AbortSignal): Promise<RegistryUserItem[]> => {
      const items = await searchAdminTeamRegistry(orgId, teamId, query, signal);
      return items.map((item) => ({
        avatarUrl: item.avatarUrl,
        displayName: item.displayName,
        email: item.email,
        staffUid: item.staffUid,
        // Ключ выбора = staffUid: добавляем только из реестра, не из трекера.
        trackerId: item.staffUid,
      }));
    },
    [orgId, teamId]
  );
  const selectedPreview = useMemo((): RegistryUserItem | null => {
    const staffUid = addStaffUid.trim();
    if (!staffUid) return null;
    return {
      displayName: addStaffMeta?.displayName?.trim() || staffUid,
      email: addStaffMeta?.email ?? null,
      staffUid,
      trackerId: staffUid,
    };
  }, [addStaffMeta, addStaffUid]);

  return (
    <UserSelector
      allowClear
      menuZIndex={ZIndex.modal + 1}
      placeholder={t('admin.teamMembers.registrySearchPlaceholder')}
      searchFn={searchRegistry}
      selectedPreview={selectedPreview}
      title={t('admin.teamMembers.userTitle')}
      value={addStaffUid}
      onChange={(staffUid, user) => {
        setAddStaffUid(staffUid);
        setAddStaffMeta(
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
