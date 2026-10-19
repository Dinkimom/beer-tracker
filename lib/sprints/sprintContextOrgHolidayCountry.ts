import type { HolidayCountryCode } from '@/lib/holidays/holidayCountries';

import { readOrgHolidayCountry } from '@/lib/holidays/orgHolidayCountry';
import { findOrganizationById } from '@/lib/organizations';

export async function loadOrgHolidayCountry(
  organizationId: string
): Promise<HolidayCountryCode> {
  const org = await findOrganizationById(organizationId);
  return readOrgHolidayCountry(org?.settings);
}
