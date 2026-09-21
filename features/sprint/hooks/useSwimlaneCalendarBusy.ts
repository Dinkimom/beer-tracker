import type {
  CalendarBusySegment,
  ParsedCalendarEvent,
} from '@/lib/calendar/calendarEventTypes';

import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { PARTS_PER_DAY } from '@/constants';
import { fetchCalDavCalendarEventsFromApi } from '@/lib/api/calendar';
import {
  DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY,
  readDeveloperCalDavCredentialsStore,
} from '@/lib/calendar/developerCalDavCredentialsStorage';
import {
  distributeCalendarEventsToDevelopers,
  normalizeCalendarEmail,
  type CalendarBusyDeveloperRef,
} from '@/lib/calendar/distributeCalendarEventsToDevelopers';
import { mapCalendarEventsToBusySegments } from '@/lib/calendar/mapCalendarEventsToBusySegments';
import { getWorkingDaysRange } from '@/utils/dateUtils';

function readCredentialsSnapshot() {
  return readDeveloperCalDavCredentialsStore();
}

function buildSprintTimeRange(
  sprintStartDate: Date,
  workingDaysCount: number
): { timeMax: string; timeMin: string } | null {
  const days = getWorkingDaysRange(sprintStartDate, workingDaysCount);
  if (days.length === 0) {
    return null;
  }
  const start = new Date(days[0]!);
  start.setHours(0, 0, 0, 0);
  const end = new Date(days[days.length - 1]!);
  end.setHours(23, 59, 59, 999);
  return { timeMax: end.toISOString(), timeMin: start.toISOString() };
}

/** Email для матчинга: staff email или email из сохранённых CalDAV-credentials. */
function resolveDeveloperEmail(
  developer: CalendarBusyDeveloperRef,
  credentialsEmail: string | undefined
): string | null {
  return (
    normalizeCalendarEmail(developer.email) ?? normalizeCalendarEmail(credentialsEmail)
  );
}

export function useSwimlaneCalendarBusyByDeveloper(input: {
  developers: CalendarBusyDeveloperRef[];
  enabled: boolean;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
}): Map<string, CalendarBusySegment[]> {
  const { developers, enabled, sprintStartDate, sprintTimelineWorkingDays } = input;
  const [credentialsStore, setCredentialsStore] = useState(readCredentialsSnapshot);

  useEffect(() => {
    const sync = () => setCredentialsStore(readCredentialsSnapshot());
    const onStorage = (event: StorageEvent) => {
      if (event.key === DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY) sync();
    };
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('localStorageChange', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('localStorageChange', onCustom as EventListener);
    };
  }, []);

  const timeRange = useMemo(
    () => buildSprintTimeRange(sprintStartDate, sprintTimelineWorkingDays),
    [sprintStartDate, sprintTimelineWorkingDays]
  );

  const totalParts = sprintTimelineWorkingDays * PARTS_PER_DAY;

  const developersWithCredentials = useMemo(
    () => developers.map((d) => d.id.trim()).filter((id) => id && credentialsStore[id]),
    [credentialsStore, developers]
  );

  const developersForMatch = useMemo((): CalendarBusyDeveloperRef[] => {
    return developers.map((developer) => ({
      email: resolveDeveloperEmail(developer, credentialsStore[developer.id]?.email),
      id: developer.id,
    }));
  }, [credentialsStore, developers]);

  const queries = useQueries({
    queries: developersWithCredentials.map((developerId) => {
      const creds = credentialsStore[developerId]!;
      return {
        enabled: enabled && Boolean(timeRange),
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          fetchCalDavCalendarEventsFromApi(
            {
              appPassword: creds.appPassword,
              caldavUrl: creds.caldavUrl,
              email: creds.email,
              timeMax: timeRange!.timeMax,
              timeMin: timeRange!.timeMin,
            },
            signal
          ),
        queryKey: [
          'swimlane-calendar-busy',
          developerId,
          timeRange?.timeMin,
          timeRange?.timeMax,
          creds.updatedAt,
        ],
        staleTime: 5 * 60 * 1000,
      };
    }),
  });

  const queryDataKey = queries.map((q) => q.dataUpdatedAt).join('|');

  return useMemo(() => {
    const eventsByOwnerId = new Map<string, ParsedCalendarEvent[]>();
    developersWithCredentials.forEach((developerId, index) => {
      const events = queries[index]?.data;
      if (events?.length) {
        eventsByOwnerId.set(developerId, events);
      }
    });

    const distributed = distributeCalendarEventsToDevelopers({
      developers: developersForMatch,
      eventsByOwnerId,
    });

    const map = new Map<string, CalendarBusySegment[]>();
    for (const developer of developers) {
      const events = distributed.get(developer.id) ?? [];
      map.set(
        developer.id,
        events.length > 0
          ? mapCalendarEventsToBusySegments(events, sprintStartDate, totalParts)
          : []
      );
    }
    return map;
    // queryDataKey tracks refetch completion without depending on the whole queries array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queries data keyed via queryDataKey
  }, [
    developers,
    developersForMatch,
    developersWithCredentials,
    queryDataKey,
    sprintStartDate,
    totalParts,
  ]);
}
