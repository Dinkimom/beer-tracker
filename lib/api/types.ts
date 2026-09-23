/**
 * Общие типы, экспортируемые из API (используются в фичах и в других модулях API).
 */

export interface TransitionItem {
  display?: string;
  id: string;
  key?: string;
  screen?: { id: string };
  to?: { display?: string; id?: string; key: string; statusTypeKey?: string };
}

export interface RegistryUserItem {
  avatarUrl?: string | null;
  displayName: string;
  email?: string | null;
  /** uuid из public.registry_employees — для POST /teams/members { staffUid } */
  staffUid?: string;
  trackerId: string;
}

export interface TransitionField {
  display: string;
  id: string;
  /** Список значений для select (FixedList или резолюции очереди / workflow) */
  options?: Array<string | { label: string; value: string }>;
  required: boolean;
  /** Тип элементов массива из schema.items (user, string...) — для array-полей */
  schemaItems?: string;
  /** Тип из schema (user, string, date, float, integer, resolution, array...) — для рендера формы */
  schemaType?: string;
}

/** Доска из GET /api/boards (команды организации в PG, видимые профилю) */
export interface BoardListItem {
  id: number;
  name: string;
  queue: string;
  /** Slug команды в PG (стабильный ключ, например для метаданных). */
  team: string;
  /** Отображаемое название команды в продукте. */
  teamTitle: string;
}

/** Порядок стори и задач во вкладке «Занятость» */
export interface OccupancyTaskOrder {
  parentIds: string[];
  taskOrders: Record<string, string[]>;
}

/** Черновые строки фич и порядок/видимость доски «по фичам» */
export type { FeatureLanesDocument } from '@/lib/sprints/featureLanesDocument';

/** Тип строки дневного ченжлога (тултип берндауна): по полям issue_logs, не только агрегаты реплея. */
type BurndownDayChangelogItemType =
  | 'added'
  /** @deprecated в пользу status_change; может встречаться в старых кэшах API */
  | 'closed'
  | 'reestimated'
  | 'removed'
  /** Поле sprint изменилось, но не вхождение/выход из текущего спринта (или прочий сценарий) */
  | 'sprint_field_change'
  | 'status_change'
  | 'story_points_change'
  | 'test_points_change';

/** Элемент ченжлога за день для тултипа берндауна */
export interface BurndownDayChangelogItem {
  change: number;
  changeTP: number;
  issueKey: string;
  pointsFrom?: number | null;
  pointsTo?: number | null;
  remainingSP: number;
  remainingTP: number;
  statusFromKey?: string;
  statusToKey?: string;
  summary: string;
  type: BurndownDayChangelogItemType;
}

/** Ответ Tracker GET /myself — текущий пользователь (аватар из beer_tracker.staff.avatar_url) */
export interface TrackerMyselfUser {
  /** URL аватара из beer_tracker.staff.avatar_url */
  avatarUrl?: string | null;
  /** Дата рождения из public.registry_employees.birthdate (YYYY-MM-DD) */
  birthdate?: string | null;
  display: string;
  email: string;
  firstName: string;
  lastName: string;
  login: string;
  /** Tracker user id, совпадает с uid для наших пользователей */
  trackerUid: number;
  /** Tracker numeric id (uid из /myself) */
  uid: number;
}

export type {
  SprintScoreResponse,
  SprintScoreRow,
} from '@/lib/sprints/sprintScoreHelpers';

