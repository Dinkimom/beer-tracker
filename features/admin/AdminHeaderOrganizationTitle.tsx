export function AdminHeaderOrganizationTitle({
  canAdmin,
  organizationName,
  fallbackTitle,
}: {
  canAdmin: boolean;
  fallbackTitle: string;
  organizationName: string | null;
}) {
  if (canAdmin) {
    const title = organizationName?.trim() || '—';
    return (
      <span className="whitespace-nowrap text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
      {fallbackTitle}
    </span>
  );
}
