import type { DomainRole, Platform } from '@/lib/roles/catalog';

import { Button } from '@/components/Button';
import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { adminFormCheckbox, field, label, muted } from '@/features/admin/adminUiTokens';

import { PLATFORM_VALUES } from '../rolesPageConstants';

interface OrganizationRoleTableRowEditProps {
  domainOptions: CustomSelectOption<DomainRole>[];
  editBusy: boolean;
  editDomainRole: DomainRole;
  editPlatforms: Platform[];
  editTitle: string;
  slug: string;
  cancelEdit: () => void;
  setEditDomainRoleSafe: (v: DomainRole) => void;
  setEditTitle: (v: string) => void;
  submitEdit: (slug: string) => Promise<void>;
  toggleEditPlatform: (p: Platform) => void;
}

export function OrganizationRoleTableRowEdit({
  cancelEdit,
  domainOptions,
  editBusy,
  editDomainRole,
  editPlatforms,
  editTitle,
  setEditDomainRoleSafe,
  setEditTitle,
  slug,
  submitEdit,
  toggleEditPlatform,
}: OrganizationRoleTableRowEditProps) {
  const { t } = useI18n();

  return (
    <tr>
      <td className="py-3 pr-4 align-top" colSpan={5}>
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-900/40">
          <p className={`text-xs ${muted}`}>
            Slug: <code className="font-mono text-gray-800 dark:text-gray-200">{slug}</code>{' '}
            {t('admin.rolesPage.rowSlugNote')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor={`edit-title-${slug}`}>
                {t('admin.rolesPage.rowTitle')}
              </label>
              <input
                className={field}
                id={`edit-title-${slug}`}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <span className={label}>{t('admin.rolesPage.rowDomainRole')}</span>
              <CustomSelect
                className="w-full"
                options={domainOptions}
                selectedPrefix=""
                title={t('admin.rolesPage.roleSelectTitle')}
                value={editDomainRole}
                onChange={setEditDomainRoleSafe}
              />
            </div>
          </div>
          {editDomainRole === 'developer' ? (
            <div>
              <span className={label}>{t('admin.rolesPage.rowPlatforms')}</span>
              <div className="mt-1 flex flex-wrap gap-4">
                {PLATFORM_VALUES.map((p) => (
                  <label
                    key={p}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      checked={editPlatforms.includes(p)}
                      className={adminFormCheckbox}
                      type="checkbox"
                      onChange={() => toggleEditPlatform(p)}
                    />
                    {t(`admin.rolesPage.platform.${p}`)}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              className="px-3.5 py-2"
              disabled={editBusy || !editTitle.trim()}
              type="button"
              variant="primary"
              onClick={() => void submitEdit(slug)}
            >
              {editBusy ? t('admin.rolesPage.saveBusy') : t('admin.rolesPage.save')}
            </Button>
            <Button
              className="px-3.5 py-2"
              disabled={editBusy}
              type="button"
              variant="outline"
              onClick={cancelEdit}
            >
              {t('admin.rolesPage.cancel')}
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}
