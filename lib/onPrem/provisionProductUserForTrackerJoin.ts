import type { OrgMemberRole } from '@/lib/organizations/types';

import { findUserByEmail } from '@/lib/auth';
import { insertOrganizationMember } from '@/lib/organizations/organizationMembersRepository';

/**
 * Резолвит сотрудника в `staff` и при org_admin выдаёт строку в beer_tracker.admins.
 */
export async function provisionProductUserForTrackerJoin(input: {
  organizationId: string;
  emailNorm: string;
  orgRole: OrgMemberRole;
}): Promise<{ userId: string }> {
  const emailNorm = input.emailNorm.trim().toLowerCase();
  const identity = await findUserByEmail(emailNorm);
  if (!identity) {
    throw new Error('Сотрудник не найден в справочнике организации');
  }

  if (input.orgRole === 'org_admin') {
    await insertOrganizationMember(input.organizationId, identity.id, 'org_admin');
  }

  return { userId: identity.id };
}
