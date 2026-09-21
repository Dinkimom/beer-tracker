import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

interface OrganizationRoleTableRowDeleteConfirmProps {
  deleteBusy: boolean;
  slug: string;
  title: string;
  cancelDelete: () => void;
  confirmDelete: (slug: string) => Promise<void>;
}

export function OrganizationRoleTableRowDeleteConfirm({
  cancelDelete,
  confirmDelete,
  deleteBusy,
  slug,
  title,
}: OrganizationRoleTableRowDeleteConfirmProps) {
  const { t } = useI18n();

  return (
    <tr>
      <td className="py-3 pr-4" colSpan={5}>
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm text-amber-950 dark:text-amber-100">
            {t('admin.rolesPage.deleteConfirm', { title, slug })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="px-3.5 py-2"
              disabled={deleteBusy}
              type="button"
              variant="dangerOutline"
              onClick={() => void confirmDelete(slug)}
            >
              {deleteBusy ? t('admin.rolesPage.deleteBusy') : t('admin.rolesPage.delete')}
            </Button>
            <Button
              className="px-3.5 py-2"
              disabled={deleteBusy}
              type="button"
              variant="outline"
              onClick={cancelDelete}
            >
              {t('admin.rolesPage.cancel')}
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}
