import type { HolidayCountryCode } from '@/lib/holidays/holidayCountries';

import { normalizeHolidayCountry } from '@/lib/holidays/holidayCountries';
import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface OrgHolidayCountryPayload {
  holidayCountry: HolidayCountryCode;
  isStored?: boolean;
}

function parsePayload(raw: unknown): OrgHolidayCountryPayload {
  if (!raw || typeof raw !== 'object') {
    return { holidayCountry: normalizeHolidayCountry(undefined), isStored: false };
  }
  const row = raw as { holidayCountry?: unknown; isStored?: unknown };
  return {
    holidayCountry: normalizeHolidayCountry(row.holidayCountry),
    isStored: row.isStored === true,
  };
}

export async function fetchOrgHolidayCountry(
  organizationId: string
): Promise<OrgHolidayCountryPayload> {
  const { data } = await getPlannerBeerTrackerApi().get<OrgHolidayCountryPayload>(
    `/organizations/${organizationId}/holiday-country`
  );
  return parsePayload(data);
}

export async function patchOrgHolidayCountry(
  organizationId: string,
  holidayCountry: HolidayCountryCode
): Promise<HolidayCountryCode> {
  const { data } = await getPlannerBeerTrackerApi().patch<OrgHolidayCountryPayload>(
    `/organizations/${organizationId}/holiday-country`,
    { holidayCountry }
  );
  return parsePayload(data).holidayCountry;
}
