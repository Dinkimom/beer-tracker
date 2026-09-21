import { NextResponse } from 'next/server';

import { findTeamById } from '@/lib/staffTeams';

export async function resolveTeamCreateSlug(params: {
  allocateUniqueTeamSlug: (orgId: string, title: string) => Promise<string>;
  orgId: string;
  orgTeams: Array<{ slug: string }>;
  slugInput: string | undefined;
  title: string;
}): Promise<NextResponse | { slug: string }> {
  const slugInput = params.slugInput?.trim();
  if (slugInput) {
    if (params.orgTeams.some((team) => team.slug === slugInput)) {
      return NextResponse.json(
        { error: `Слуг «${slugInput}» уже занят другой командой` },
        { status: 409 }
      );
    }
    return { slug: slugInput };
  }
  const slug = await params.allocateUniqueTeamSlug(params.orgId, params.title);
  return { slug };
}

export async function assertTeamExists(orgId: string, teamId: string) {
  const team = await findTeamById(orgId, teamId);
  if (!team) {
    return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
  }
  return team;
}
