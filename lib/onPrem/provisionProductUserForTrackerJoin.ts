import type { OrgMemberRole } from '@/lib/organizations/types';

import { insertOrganizationMember } from '@/lib/organizations/organizationMembersRepository';

/**
 * Выдаёт доступ к продукту для уже созданного `staff` (id = user id).
 * При org_admin пишет роль админа организации.
 */
export async function provisionProductUserForTrackerJoin(input: {
  organizationId: string;
  orgRole: OrgMemberRole;
  staffId: string;
}): Promise<{ userId: string }> {
  const staffId = input.staffId.trim();
  if (!staffId) {
    throw new Error('Сотрудник не найден в справочнике организации');
  }

  if (input.orgRole === 'org_admin') {
    await insertOrganizationMember(input.organizationId, staffId, 'org_admin');
  }

  return { userId: staffId };
}
