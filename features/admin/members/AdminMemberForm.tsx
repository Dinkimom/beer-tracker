import type { CustomSelectOption } from '@/components/CustomSelect';
import type { RegistryUserItem } from '@/lib/api/types';
import type { FormEvent } from 'react';

import { useCallback } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { Input } from '@/components/Input';
import { useI18n } from '@/contexts/LanguageContext';
import { label } from '@/features/admin/adminUiTokens';
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
  /** id формы: кнопка отправки стоит в подвале окна и ссылается на неё атрибутом `form`. */
  formId: string;
  idPrefix: string;
  orgId: string;
  resetIdentityOnClear: boolean;
  roleOptions: CustomSelectOption<string>[];
  showRoleSelect: boolean;
  teamOptions: AdminMemberTeamOption[];
  values: AdminMemberFormValues;
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
  formId,
  idPrefix,
  onChange,
  onSubmit,
  orgId,
  resetIdentityOnClear,
  roleOptions,
  showRoleSelect,
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
    <form className="space-y-3" id={formId} onSubmit={onSubmit}>
      <div>
        <label className={label}>{t('admin.membersPage.trackerSearchLabel')}</label>
        <UserSelector
          allowClear
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
        <Input
          id={nameId}
          required
          type="text"
          value={values.displayName}
          onChange={(event) => onChange({ ...values, displayName: event.target.value })}
        />
      </div>
      <AdminMemberTeamsMultiSelect
        disabled={busy}
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
    </form>
  );
}
