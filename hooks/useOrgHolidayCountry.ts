'use client';

import type { HolidayCountryCode } from '@/lib/holidays/holidayCountries';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { useHolidayCountryStorage } from '@/hooks/useLocalStorage';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import {
  fetchOrgHolidayCountry,
  patchOrgHolidayCountry,
} from '@/lib/api/holidayCountry';
import {
  DEFAULT_HOLIDAY_COUNTRY,
  normalizeHolidayCountry,
} from '@/lib/holidays/holidayCountries';

function holidayCountryQueryKey(organizationId: string) {
  return ['org-holiday-country', organizationId] as const;
}

/** Avoid duplicate promote PATCHes when several components mount the hook. */
const promotedOrgIds = new Set<string>();

function readCachedHolidayCountry(): HolidayCountryCode {
  if (typeof window === 'undefined') {
    return DEFAULT_HOLIDAY_COUNTRY;
  }
  try {
    return normalizeHolidayCountry(window.localStorage.getItem(STORAGE_KEYS.HOLIDAY_COUNTRY));
  } catch {
    return DEFAULT_HOLIDAY_COUNTRY;
  }
}

function promoteOrgHolidayCountry(input: {
  organizationId: string;
  serverDefault: HolidayCountryCode;
}): Promise<HolidayCountryCode> {
  const cached = readCachedHolidayCountry();
  const promote =
    cached !== DEFAULT_HOLIDAY_COUNTRY ? cached : input.serverDefault;
  return patchOrgHolidayCountry(input.organizationId, promote);
}

/**
 * Страна календаря праздников организации (Settings → General).
 * localStorage — кэш для UI; при первом незаписанном org поднимает локальное значение.
 */
export function useOrgHolidayCountry(): {
  holidayCountry: HolidayCountryCode;
  setHolidayCountry: (value: HolidayCountryCode) => void;
} {
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const [localCountry, setLocalCountry] = useHolidayCountryStorage();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    enabled: Boolean(activeOrganizationId),
    queryFn: () => fetchOrgHolidayCountry(activeOrganizationId!),
    queryKey: activeOrganizationId
      ? holidayCountryQueryKey(activeOrganizationId)
      : ['org-holiday-country', 'none'],
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (country: HolidayCountryCode) => {
      if (!activeOrganizationId) {
        return Promise.resolve(country);
      }
      return patchOrgHolidayCountry(activeOrganizationId, country);
    },
    onSuccess: (country) => {
      setLocalCountry(country);
      if (activeOrganizationId) {
        queryClient.setQueryData(holidayCountryQueryKey(activeOrganizationId), {
          holidayCountry: country,
          isStored: true,
        });
      }
    },
  });

  useEffect(() => {
    if (!data || !activeOrganizationId) {
      return;
    }
    if (data.isStored) {
      setLocalCountry(data.holidayCountry);
      return;
    }
    if (promotedOrgIds.has(activeOrganizationId)) {
      return;
    }
    promotedOrgIds.add(activeOrganizationId);
    promoteOrgHolidayCountry({
      organizationId: activeOrganizationId,
      serverDefault: data.holidayCountry,
    }).then((country) => {
      setLocalCountry(country);
      queryClient.setQueryData(holidayCountryQueryKey(activeOrganizationId), {
        holidayCountry: country,
        isStored: true,
      });
    });
  }, [activeOrganizationId, data, queryClient, setLocalCountry]);

  return {
    holidayCountry: data?.holidayCountry ?? localCountry,
    setHolidayCountry: (value) => {
      setLocalCountry(value);
      mutation.mutate(value);
    },
  };
}
