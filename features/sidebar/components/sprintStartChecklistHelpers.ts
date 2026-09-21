import type { SprintStartLoadNorms } from '@/features/sprint/utils/sprintStartChecksHelpers';
import type { Developer } from '@/types';

import {
  developerLoadMeetsSprintStartNorm,
  resolveSprintStartLoadNorms,
} from '@/features/sprint/utils/sprintStartChecksHelpers';

export interface SprintStartDeveloperLoad {
  dev: Pick<Developer, 'id' | 'name' | 'role'>;
  isDeveloper: boolean;
  isQA: boolean;
  totalSP: number;
  totalTP: number;
}

export function isDeveloperLoadInvalid(
  load: SprintStartDeveloperLoad,
  norms: SprintStartLoadNorms = resolveSprintStartLoadNorms()
): boolean {
  return !developerLoadMeetsSprintStartNorm(load, norms);
}

export function developerLoadListKey(load: SprintStartDeveloperLoad): string {
  const isTester = load.dev.role === 'tester';
  return `${load.dev.id}-${isTester ? 'qa' : 'dev'}`;
}

export function isDeveloperLoadTester(load: SprintStartDeveloperLoad): boolean {
  return load.dev.role === 'tester';
}
