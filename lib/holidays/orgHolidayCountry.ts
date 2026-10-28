import {
  DEFAULT_HOLIDAY_COUNTRY,
  normalizeHolidayCountry,
  type HolidayCountryCode,
} from '@/lib/holidays/holidayCountries';
import { isRecord } from '@/lib/isRecord';


interface OrgHolidayCountryState {
  holidayCountry: HolidayCountryCode;
  /** true when settings.planner.holidayCountry was explicitly set. */
  isStored: boolean;
}

/** Страна календаря праздников из organizations.settings.planner. */
export function readOrgHolidayCountryState(settingsRoot: unknown): OrgHolidayCountryState {
  if (!isRecord(settingsRoot) || !isRecord(settingsRoot.planner)) {
    return { holidayCountry: DEFAULT_HOLIDAY_COUNTRY, isStored: false };
  }
  if (!('holidayCountry' in settingsRoot.planner)) {
    return { holidayCountry: DEFAULT_HOLIDAY_COUNTRY, isStored: false };
  }
  return {
    holidayCountry: normalizeHolidayCountry(settingsRoot.planner.holidayCountry),
    isStored: true,
  };
}

export function readOrgHolidayCountry(settingsRoot: unknown): HolidayCountryCode {
  return readOrgHolidayCountryState(settingsRoot).holidayCountry;
}

/** Пишет holidayCountry в settings.planner, не трогая timeslots/estimateUnit. */
export function mergeOrgHolidayCountry(
  settingsRoot: unknown,
  country: HolidayCountryCode
): Record<string, unknown> {
  const root = isRecord(settingsRoot) ? { ...settingsRoot } : {};
  const planner = isRecord(root.planner) ? { ...root.planner } : {};
  planner.holidayCountry = country;
  root.planner = planner;
  return root;
}
