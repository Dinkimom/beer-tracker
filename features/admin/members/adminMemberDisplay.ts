import type { RegistryEmployeeDirectoryRow } from '@/lib/organizations/organizationMembersRepository';

function normalizedMemberField(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return '';
}

export function memberDisplayName(row: RegistryEmployeeDirectoryRow): string {
  const full = normalizedMemberField(row.full_name);
  if (full) return full;
  const composed = [normalizedMemberField(row.surname), normalizedMemberField(row.name), normalizedMemberField(row.patronymic)]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (composed) return composed;
  return (
    normalizedMemberField(row.email) ||
    normalizedMemberField(row.tracker_id) ||
    normalizedMemberField(row.employee_id) ||
    normalizedMemberField(row.staff_uid) ||
    '—'
  );
}

export function memberInitials(row: RegistryEmployeeDirectoryRow): string {
  const display = memberDisplayName(row);
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?';
}

export function sortMembersByDisplayName(
  rows: RegistryEmployeeDirectoryRow[]
): RegistryEmployeeDirectoryRow[] {
  return [...rows].sort((a, b) => memberDisplayName(a).localeCompare(memberDisplayName(b), 'ru'));
}
