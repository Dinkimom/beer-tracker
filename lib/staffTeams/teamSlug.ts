/**
 * Уникальный slug команды в организации (только сервер).
 */

import { generateTeamSlugFromTitle } from './teamSlugGenerate';
import { listTeams } from './teamsRepository';

export async function allocateUniqueTeamSlug(organizationId: string, title: string): Promise<string> {
  const base = generateTeamSlugFromTitle(title);
  const teams = await listTeams(organizationId, { activeOnly: false });
  const used = new Set(teams.map((t) => t.slug));
  const candidate = base;
  if (!used.has(candidate)) {
    return candidate;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}
