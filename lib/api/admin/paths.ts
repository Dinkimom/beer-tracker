/** Префикс admin API для организации. */
export function adminOrgApiPath(orgId: string, suffix = ''): string {
  const base = `/admin/organizations/${orgId}`;
  return suffix ? `${base}/${suffix.replace(/^\//, '')}` : base;
}

export function adminTeamApiPath(orgId: string, teamId: string, suffix = ''): string {
  const base = `${adminOrgApiPath(orgId, 'teams')}/${teamId}`;
  return suffix ? `${base}/${suffix.replace(/^\//, '')}` : base;
}
