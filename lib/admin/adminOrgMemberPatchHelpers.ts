import type { OrgMemberRole } from '@/lib/organizations/types';

import { NextResponse } from 'next/server';

import {
  countOrganizationMembersByRole,
  findOrganizationMembership,
} from '@/lib/organizations/organizationMembersRepository';

export async function validateOrgMemberRoleChange(args: {
  nextRole: OrgMemberRole;
  orgId: string;
  requesterUserId: string;
  targetUserId: string;
}): Promise<NextResponse | null> {
  if (args.targetUserId === args.requesterUserId) {
    return NextResponse.json(
      { error: 'Нельзя изменить свою роль в организации' },
      { status: 403 }
    );
  }

  const existing = await findOrganizationMembership(args.orgId, args.targetUserId);
  if (!existing) {
    return NextResponse.json({ error: 'Участник не найден' }, { status: 404 });
  }

  if (existing.role === 'org_admin' && args.nextRole !== 'org_admin') {
    const admins = await countOrganizationMembersByRole(args.orgId, 'org_admin');
    if (admins <= 1) {
      return NextResponse.json(
        { error: 'Нельзя снять последнего администратора организации' },
        { status: 400 }
      );
    }
  }

  return null;
}
