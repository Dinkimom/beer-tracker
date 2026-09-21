/**
 * Slug организации из названия + уникальность в БД.
 */

import { randomBytes } from 'crypto';

import { findOrganizationBySlug } from '@/lib/organizations/organizationRepository';

function slugifyOrganizationName(name: string): string {
  const parts = name
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 0);
  const s = parts.join('-').slice(0, 48);
  return s.length > 0 ? s : 'org';
}

export async function allocateUniqueOrganizationSlug(name: string): Promise<string> {
  const base = slugifyOrganizationName(name);
  let candidate = base;
  for (let n = 0; n < 20; n += 1) {
    const existing = await findOrganizationBySlug(candidate);
    if (!existing) {
      return candidate;
    }
    const suffix = randomBytes(3).toString('hex');
    candidate = `${base}-${suffix}`;
  }
  throw new Error('allocateUniqueOrganizationSlug: could not allocate slug');
}
