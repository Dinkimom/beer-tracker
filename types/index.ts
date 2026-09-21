import type { ChecklistItem } from './tracker';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { StickyNoteReaction } from '@/lib/comments/stickyNoteReaction';
import type { TaskStatus } from '@/utils/statusMapper';

export type Team = 'Back' | 'DevOps' | 'QA' | 'Web';

/**
 * Фильтр статуса задач (active, all, completed)
 */
export type StatusFilter = 'active' | 'all' | 'completed';

/**
 * Статус спринта или части дня (current, future, past)
 */
export type SprintStatus = 'current' | 'future' | 'past';

/**
 * Тип оценки (Story Points или Test Points)
 */
export type PointsType = 'SP' | 'TP';

/** Сторона/якорь для связей и тултипов */
export type Anchor = 'bottom' | 'left' | 'right' | 'top';

/** Группировка в сайдбаре задач */
export type SidebarGroupBy = 'assignee' | 'none' | 'parent';

/** Вкладка «Все / Dev / QA» в сайдбаре */
export type SidebarTasksTab = 'all' | 'dev' | 'qa';

/** Вариант отображения карточки задачи */
export type TaskCardVariant = 'sidebar' | 'swimlane';

/** Режим ширины колонок на доске (Board/Swimlane): compact = узкие, full = широкие */
export type LayoutViewMode = 'compact' | 'full';

/** Куда переносить задачи при завершении спринта */
export type MoveTasksTo = 'backlog' | 'sprint';

/** Сортировка разработчиков в сайдбаре */
export type DevelopersSort = 'custom' | 'name' | 'sp' | 'tasks' | 'tp';

export interface TaskParent {
  display: string;
  id: string;
  key: string;
  self?: string;
}

export interface Task {
  assignee?: string;
  // ID исполнителя
  assigneeName?: string;
  createdAt?: string;
  /** Признак/метка опасности релиза (кастомное поле Tracker dangerousRelease). */
  dangerousRelease?: string;
  /** Дедлайн из трекера (YYYY-MM-DD). */
  deadline?: string;
  description?: string;
  /** URL GET сцены схемы (`/api/sprints/.../diagram`). */
  diagramSceneUrl?: string;
  /** Эпик из трекера (если задан и нет parent, используем как родителя в отображении занятости) */
  epic?: TaskParent;
  /** Закодированная сцена Excalidraw для локальной карточки схемы (без S3). */
  excalidrawSceneText?: string;
  // Флаг для задач бэклога
  functionalTeam?: string;
  /** Число обращений в HD (SLA-баги). */
  hdCount?: number;
  /** Рост HD_count за 7 дней. */
  hdGrowth7d?: number;
  /** Рост HD_count за 24 часа. */
  hdGrowth24h?: number;
  /** В standalone_qa_tasks режимe в UI скрываем TP и работаем только со SP. */
  hideTestPointsByIntegration?: boolean;
  id: string;
  /** Превью картинки для локальной карточки-фото (blob: URL, без персиста). */
  imageUrl?: string;
  /** Критичность инцидента (из Tracker) */
  incidentSeverity?: string;
  isBacklogTask?: boolean;
  isLocalTask?: boolean;
  /** Ключевой клиент (SLA-баги). */
  keyClient?: boolean;
  /** Дата последнего обращения в HD (для SLA-багов). */
  lastHdAt?: string;
  link: string;
  linkedTaskIds?: string[];
  /** Вид локального черновика quick-add: задача, поиск в трекере, заметка, схема или картинка. */
  localDraftKind?: 'comment' | 'diagram' | 'existing' | 'image' | 'task';
  MergeRequestLink?: string;
  /** Ссылка на merge request (алиас для удобства, может мапиться на MergeRequestLink) */
  mergeRequestLink?: string;
  name: string;
  /** Ссылка на merge request (кастомное поле Tracker, оригинальное имя поля) */

  originalStatus?: string;
  // Оригинальный ключ статуса из трекера
  originalTaskId?: string;
  /** Родительская задача (story, epic и т.п.) */
  parent?: TaskParent;
  /** MCP/agent draft waiting for apply — translucent until confirmed. */
  pendingApproval?: boolean;
  // Оригинальный ID задачи (для QA задач - ID дев задачи)
  position?: TaskPosition;
  priority?: string;
  // Функциональная команда
  productTeam?: string[];
  // Имя исполнителя из API
  qaEngineer?: string;
  // ID QA инженера (для задач тестирования)
  qaEngineerName?: string;
  /** Дата закрытия (resolved) в Tracker. */
  resolvedAt?: string;
  /** Дедлайн SLA. */
  slaDeadline?: string;
  // Этап
  sprints?: Array<{
    display: string;
    id: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    startDateTime?: string;
    endDateTime?: string;
    status?: string;
  }>;
  // Продуктовая команда (bizErpTeam)
  stage?: string;
  /** Дата начала из трекера (YYYY-MM-DD). */
  start?: string;
  // Имя QA инженера из API
  status?: TaskStatus;
  /** Ключ палитры из STATUS_COLOR_MAP (интеграция: statuses.overridesByStatusKey[*].visualToken) */
  statusColorKey?: string;
  /** Ключ типа статуса трекера (statusType.key) — для категории done по воркфлоу. */
  statusTypeKey?: string;
  /** Отображаемое имя автора карточки заметки. */
  stickyNoteAuthorName?: string;
  /** Цвет карточки заметки на свимлейне. */
  stickyNoteColor?: StickyNoteColor;
  // Описание задачи (для целей спринта)
  storyPoints?: number;
  /** Пуш приоритета от поддержки. */
  supPriority?: boolean;
  // Test Points (TP) - отдельная оценка для тестирования
  team: Team;
  /** Совпала цепочка правил «только тестирование» из trackerIntegration.testingFlow (embedded) */
  testingOnlyByIntegrationRules?: boolean;
  // Story Points (SP) - может быть undefined для задач без оценки
  testPoints?: number;
  /** Очередь Tracker для локального черновика quick-add (до создания задачи). */
  trackerQueue?: string;
  /** Отображаемое имя очереди Tracker (если пришло из API). */
  trackerQueueName?: string;
  /** Теги Tracker (нормализованные, lowercase) для SLA-действий и интеграций. */
  trackerTags?: string[];
  // Тип задачи (bug, task, epic, story и т.д.)
  type?: string;
  /** Дата последнего обновления в трекере. */
  updatedAt?: string;
  // Приоритет задачи (blocker, critical, major, normal, minor, trivial, urgent, high, medium, low, etc.)
  // Спринты, в которых находится задача
}

/** Один отрезок фазы занятости (при дроблении фазы на несколько отрезков) */
export interface PhaseSegment {
  duration: number;
  startDay: number;
  startPart: number;
}

export interface TaskPosition {
  assignee: string;
  // 0-2 (3 части дня)
  duration: number;
  /** Статус задачи (для раскраски «запланировано в спринт» по статусу, как фазы занятости) */
  originalStatus?: string;
  plannedDuration?: number;
  // количество частей дня
// Плановая позиция (baseline) - сохраняется при первом размещении задачи
  plannedStartDay?: number;
  plannedStartPart?: number;
  /** Отрезки фазы. Если задан и не пуст — занятость считается по отрезкам; иначе один непрерывный блок [startDay, startPart, duration]. */
  segments?: PhaseSegment[];
  /** ID задачи в спринте (для запроса статуса при отрисовке «запланировано в спринт») */
  sourceTaskId?: string;
  /** Название задачи (для отрисовки «ключ + название» в колбасе при ширине > 3 дней) */
  sourceTaskSummary?: string;
  startDay: number;
  // 0-9 (10 рабочих дней)
  startPart: number;
  taskId: string;
}

export interface Developer {
  /** URL фото профиля (из запроса участников команды / Tracker) */
  avatarUrl?: string | null;
  /** Email сотрудника (staff), для сопоставления с CalDAV ATTENDEE */
  email?: string | null;
  id: string;
  name: string;
  /** Платформы разработчика на основе slug роли (team_members.role_slug) */
  platforms?: ('back' | 'web')[];
  /** developer/tester — нормы SP/TP; other — остальные роли команды (аналитика, дизайн и т.д.) */
  role: 'developer' | 'other' | 'tester';
  /** Человекочитаемое название роли из team_members.role_slug */
  roleTitle?: string | null;
}

export interface TaskLink {
  fromAnchor?: Anchor;
  fromTaskId: string;
  id: string;
  toAnchor?: Anchor;
  toTaskId: string;
}

export interface Comment {
  assigneeId: string;
  /** Отображаемое имя автора заметки. */
  authorName?: string;
  /**
   * Стабильный ключ для React: задаётся при создании на клиенте и сохраняется при подстановке id с сервера,
   * чтобы карточка заметки не перемонтировалась после сохранения (попап не схлопывался).
   */
  clientInstanceId?: string;
  /** Цвет sticky-note (по умолчанию жёлтый). */
  color?: StickyNoteColor;
  /** Дата создания заметки (ISO string) */
  createdAt?: string;
  /** id сессии продукта (автор заметки). */
  createdBy?: string;
  // ID разработчика (swimlane)
  day: number;
  diagramUrl?: string;
  // Вертикальный span на свимлейне: число строк карточки (дефолт 2; схемы 1:1 с width)
  height: number;
  id: string;
  imageFileId?: string;
  imageUrl?: string;
  kind?: 'diagram' | 'image' | 'text';
  /** Родитель из Tracker (story/epic) — как у задачи, локально на заметке. */
  parent?: TaskParent;
  part: number;
  /** MCP plan-patch draft — translucent until apply_plan_patch. */
  pendingApproval?: boolean;
  /** Агрегированные реакции на заметку (с точки зрения текущего пользователя). */
  reactions?: StickyNoteReaction[];
  /**
   * Строка свимлейна в режиме «по фичам». Не пишется в API:
   * `assigneeId` остаётся человеком (аватар), сюда кладётся id строки фичи.
   */
  rowAssigneeId?: string;
  /** Клиентский флаг: не слать mention-уведомления при первом сохранении (вставка копии). */
  skipMentionNotifications?: boolean;
  text: string;
  /** Длительность на таймлайне в частях дня (legacy: большие значения — px). */
  width: number;
  // Смещение в пикселях внутри ячейки
  x: number;
  /** Сдвиг карточки вверх в строках свимлейна (layerShiftUp); legacy px мигрирован в 0. */
  y: number;
}

// ==================== Типы для событий ====================

// ==================== Типы для работы с БД ====================

/**
 * Параметр для SQL запросов.
 * Может быть скаляром (string, number, boolean, null) или массивом скаляров
 * для конструкций вида ANY($1::int[]).
 * Date, Buffer и Record — для timestamptz / bytea / jsonb (node-pg сериализует в драйвере).
 */
type QueryParamScalar =
  | Buffer
  | Date
  | Record<string, unknown>
  | boolean
  | number
  | string
  | null
  | undefined;

type QueryParamArray = ReadonlyArray<QueryParamScalar>;

/**
 * Параметры для SQL запросов
 */
export type QueryParams = Array<QueryParamArray | QueryParamScalar>;

// ==================== Типы для API ответов ====================

/**
 * Ответ от API с информацией о задаче
 */
export interface IssueResponse {
  checklistDone: number;
  checklistItems: ChecklistItem[];
  checklistTotal: number;
  createdAt?: string | null;
  description: string | null;
  key: string;
  originalStatus: string | null;
  resolvedAt?: string | null;
  status: TaskStatus | null;
  statusKey: string | null;
  summary: string;
  updatedAt?: string | null;
}

/**
 * Ответ от API с позициями задач в спринте (из БД, snake_case).
 * Сегменты запрашиваются в том же GET-обработчике и возвращаются в каждой позиции.
 */
export interface SprintPositionsResponse {
  positions: Array<{
    assignee_id: string;
    duration: number;
    is_qa?: boolean;
    planned_duration?: number | null;
    planned_start_day?: number | null;
    planned_start_part?: number | null;
    start_day: number;
    start_part: number;
    task_id: string;
    /** Отрезки фазы (из task_position_segments), если есть */
    segments?: Array<{ start_day: number; start_part: number; duration: number }>;
  }>;
}

/**
 * Ответ от API со связями задач в спринте (из БД, snake_case)
 */
export interface SprintLinksResponse {
  links: Array<{
    created_at?: string;
    from_anchor?: string | null;
    from_task_id: string;
    id: string;
    to_anchor?: string | null;
    to_task_id: string;
  }>;
}

/**
 * Ответ от API с комментариями в спринте (из БД, snake_case)
 */
export interface SprintCommentsResponse {
  comments: Array<{
    assignee_id: string;
    author_name?: string | null;
    color?: string | null;
    created_at?: string;
    created_by?: string | null;
    day: number | null;
    height: number;
    id: string;
    image_file_id?: string | null;
    kind?: 'diagram' | 'image' | 'text' | null;
    parent?: TaskParent | null;
    part: number | null;
    pending_approval?: boolean | null;
    reactions?: StickyNoteReaction[];
    text: string;
    updated_at?: string;
    width: number;
    x: number | null;
    y: number | null;
  }>;
}

/**
 * Ответ от API со списком спринтов
 */
export interface SprintsResponse {
  archived: boolean;
  board: {
    display: string;
    id: string;
    self: string;
  };
  createdAt: string;
  createdBy: {
    cloudUid: string;
    display: string;
    id: string;
    passportUid: number;
    self: string;
  };
  endDate: string;
  endDateTime: string;
  id: number;
  name: string;
  /** Опциональная метка квартала для отображения (если есть в payload). */
  quarter?: string | null;
  self: string;
  startDate: string;
  startDateTime: string;
  status: string;
  version: number;
}

/**
 * Ответ от API с задачами спринта
 */
export interface SprintTasksResponse {
  developers: Developer[];
  sprintInfo: {
    endDate: string;
    endDateTime: string;
    id: number;
    name: string;
    startDate: string;
    startDateTime: string;
    status: string;
    version?: number;
  } | null;
  tasks: Task[];
}

/**
 * Ответ от API с задачами бэклога
 */
export interface BacklogResponse {
  developers: Developer[];
  pagination: {
    page: number;
    perPage: number;
    totalCount: number;
    totalPages: number;
  };
  tasks: Task[];
}

/**
 * Импорт для ChecklistItem из trackerApi
 */
// Реэкспортируем типы Tracker API для обратной совместимости
// Реэкспортируем типы Quarterly Planning
export type {
  Quarter
} from './quarterly';
