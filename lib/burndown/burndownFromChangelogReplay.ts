/**
 * Burndown из нормализованного changelog: события → хронологический реплей → дневные точки SP/TP.
 *
 * Слои:
 * 1) Снимок на начало спринта (реплей записей строго до sprintStartTime).
 * 2) События в окне [sprintStart, sprintEnd] для линии (добавление/снятие со спринта, нетто-переоценка, переход в done).
 *    Дневной ченжлог для тултипа строится отдельно: каждое поле storyPoints/testPoints/status/sprint.
 * 3) Остаток на конец каждого календарного дня.
 */

export { sprintArrayContainsSprint } from '@/lib/burndown/sprintMembership';
export {
  applyBurndownEventType as applyBurndownEvent,
  extractStatusKey,
  toBurndownDateKey,
  type BurndownEvent,
  type TaskState,
} from './burndownFromChangelogReplayHelpers';
export {
  buildTaskStateAtSprintStart,
  collectBurndownEventsInSprintWindow,
  computeBurndownFromChangelog,
  type BurndownDataPoint,
} from './burndownFromChangelogReplaySteps';
