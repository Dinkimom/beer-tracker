import type { CustomSelectOption } from '@/components/CustomSelect';
import type { RegistryUserItem } from '@/lib/api/types';
import type { FormEvent } from 'react';

import { useCallback } from 'react';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { field, label } from '@/features/admin/adminUiTokens';
import {
  AdminMemberTeamsMultiSelect,
  type AdminMemberTeamOption,
} from '@/features/admin/members/AdminMemberTeamsMultiSelect';
import { UserSelector } from '@/features/sprint/components/SprintPlanner/components/UserSelector';
import { searchAdminOrgUsers } from '@/lib/api/admin/tracker';

export interface AdminMemberFormValues {
  displayName: string;
  email: string;
  roleSlug: string;
  teamIds: string[];
  trackerUserId: string;
}

interface AdminMemberFormProps {
  busy: boolean;
  idPrefix: string;
  orgId: string;
  resetIdentityOnClear: boolean;
  roleOptions: CustomSelectOption<string>[];
  showRoleSelect: boolean;
  submitLabel: string;
  teamOptions: AdminMemberTeamOption[];
  values: AdminMemberFormValues;
  onCancel?: () => void;
  onChange: (values: AdminMemberFormValues) => void;
  onSubmit: (event: FormEvent) => void;
}

function previewFromValues(values: AdminMemberFormValues): RegistryUserItem | null {
  const trackerId = values.trackerUserId.trim();
  if (!trackerId) {
    return null;
  }
  return {
    displayName: values.displayName.trim() || trackerId,
    email: values.email.trim() || null,
    trackerId,
  };
}

export function AdminMemberForm({
  busy,
  idPrefix,
  onCancel,
  onChange,
  onSubmit,
  orgId,
  resetIdentityOnClear,
  roleOptions,
  showRoleSelect,
  submitLabel,
  teamOptions,
  values,
}: AdminMemberFormProps) {
  const { t } = useI18n();
  const nameId = `${idPrefix}-display-name`;
  const searchTrackerUsers = useCallback(
    (query: string, signal?: AbortSignal) => searchAdminOrgUsers(orgId, query, signal),
    [orgId]
  );

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div>
        <label className={label}>{t('admin.membersPage.trackerSearchLabel')}</label>
        <UserSelector
          allowClear
          menuZIndex={ZIndex.modal + 1}
          placeholder={t('admin.membersPage.trackerSearchPlaceholder')}
          searchFn={searchTrackerUsers}
          selectedPreview={previewFromValues(values)}
          title={t('admin.membersPage.trackerSearchLabel')}
          value={values.trackerUserId}
          onChange={(trackerId, user) => {
            if (!user) {
              onChange(
                resetIdentityOnClear
                  ? {
                      displayName: '',
                      email: '',
                      roleSlug: values.roleSlug,
                      teamIds: values.teamIds,
                      trackerUserId: '',
                    }
                  : { ...values, trackerUserId: '' }
              );
              return;
            }
            onChange({
              displayName: user.displayName,
              email: user.email?.trim() ?? '',
              roleSlug: values.roleSlug,
              teamIds: values.teamIds,
              trackerUserId: trackerId,
            });
          }}
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {t('admin.membersPage.trackerSearchHint')}
        </p>
      </div>
      <div>
        <label className={label} htmlFor={nameId}>
          {t('admin.membersPage.displayNameLabel')}
        </label>
        <input
          className={field}
          id={nameId}
          required
          type="text"
          value={values.displayName}
          onChange={(event) => onChange({ ...values, displayName: event.target.value })}
        />
      </div>
      <AdminMemberTeamsMultiSelect
        disabled={busy}
        menuZIndex={ZIndex.modal + 1}
        options={teamOptions}
        selectedIds={values.teamIds}
        onChange={(teamIds) =>
          onChange({
            ...values,
            roleSlug: teamIds.length > 0 ? values.roleSlug : '',
            teamIds,
          })
        }
      />
      {showRoleSelect && values.teamIds.length > 0 ? (
        <div>
          <span className={label}>{t('admin.membersPage.catalogTeamRoleLabel')}</span>
          <CustomSelect
            className="mt-1.5 w-full"
            menuZIndex={ZIndex.modal + 1}
            options={roleOptions}
            selectedPrefix=""
            title={t('admin.membersPage.catalogTeamRoleInviteTitle')}
            value={values.roleSlug}
            onChange={(roleSlug) => onChange({ ...values, roleSlug })}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t('admin.membersPage.catalogTeamRoleHint')}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={busy} type="submit" variant="primary">
          {busy ? t('admin.membersPage.saving') : submitLabel}
        </Button>
        {onCancel ? (
          <Button disabled={busy} type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
