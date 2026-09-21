'use client';

import type { SprintStartDeveloperLoad } from './sprintStartChecklistHelpers';
import type { SprintStartLoadNorms } from '@/features/sprint/utils/sprintStartChecksHelpers';

import {
  developerLoadListKey,
  isDeveloperLoadInvalid,
  isDeveloperLoadTester,
} from './sprintStartChecklistHelpers';

interface SprintStartChecklistDeveloperLoadsProps {
  developerLoads: SprintStartDeveloperLoad[];
  loadNorms: SprintStartLoadNorms;
  t: (key: string, params?: Record<string, number | string>) => string;
}

export function SprintStartChecklistDeveloperLoads({
  developerLoads,
  loadNorms,
  t,
}: SprintStartChecklistDeveloperLoadsProps) {
  return (
    <ul className="list-none pl-0 mt-0 space-y-0.5">
      {developerLoads
        .filter((load) => isDeveloperLoadInvalid(load, loadNorms))
        .map((load) => {
          const isTester = isDeveloperLoadTester(load);
          return (
            <li key={developerLoadListKey(load)}>
              - {load.dev.name}:{' '}
              {isTester ? (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {t('sidebar.sprintStartChecklist.devLoadTpRequired', {
                    actual: load.totalTP,
                    required: loadNorms.requiredTP,
                  })}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {t('sidebar.sprintStartChecklist.devLoadSpRequired', {
                    actual: load.totalSP,
                    required: loadNorms.requiredSP,
                  })}
                </span>
              )}
            </li>
          );
        })}
    </ul>
  );
}
