# Аудит дублирующих компонентов

Обзор повторяющихся паттернов в UI и рекомендации по выносу в общие компоненты (`components/` или feature-agnostic shared).

---

## 1. Поле поиска с иконкой и кнопкой «очистить»

**Паттерн:** слева иконка лупы, справа кнопка «×» при непустом значении, один и тот же визуальный стиль.

**Где встречается:**

| Файл | Placeholder |
|------|-------------|
| `SidebarFilters.tsx` | «Поиск...» |
| `TasksTabFilters.tsx` | «Поиск по названию задачи» |
| `SprintPlannerControlsBar.tsx` | «Поиск по названию задачи» |
| `DocumentSearch.tsx` | «Поиск...» |
| `FeaturesListFilters.tsx` | «Поиск по названию, описанию, эпику...» |
| `TasksSidebar.tsx` (quarterly) | «Поиск по названию...» (используется SVG вместо `Icon`) |
| `QuarterlySprintsTimeline.tsx` | «Поиск по названию задачи» |
| `UserSelector.tsx` | «Поиск по имени или фамилии…» |
| `ParticipantsModal.tsx` | «Поиск участников из всех команд...» |

**Рекомендация:** ввести общий компонент **`SearchInput`** в `components/`:

- Пропсы: `value`, `onChange`, `placeholder`, `className?`, `size?: 'sm' | 'md'` (для высоты/шрифта).
- Внутри: `Icon name="search"` слева, `input`, при `value` — кнопка с `Icon name="x"` и `onClick` → `onChange('')`.
- Единые классы для input (border, focus, dark), различие только по `size`.

После ввода заменить перечисленные места на `<SearchInput ... />`.

---

## 2. Бейджи очков (SP / TP)

**Паттерн:** компактный бейдж «Nsp» или «Ntp» с фиксированными цветами: SP — тёмно-серый, TP — жёлтый.

**Где встречается:**

- `TaskCardTags.tsx` — несколько вариантов (узкий/широкий), общие классы `bg-gray-900` / `bg-yellow-500`.
- `TaskSidebarCard.tsx` — `px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-white` (SP), `bg-yellow-500 text-white` (TP).
- `feature-planner/TaskCard.tsx` — те же классы для SP/TP.
- `TaskBadges.tsx` (quarterly) — `bg-gray-800`, `bg-yellow-500` для SP/TP.
- `TaskDetailsPanel.tsx` — `bg-gray-800`, `bg-yellow-500` для SP/TP.

**Рекомендация:** ввести общие бейджи в `components/` (или переиспользовать из `features/task`):

- **`StoryPointsBadge`** — значение number | undefined, отображает «Nsp» или «?sp», единые классы.
- **`TestPointsBadge`** — значение number | undefined, «Ntp» или «?tp».

Либо один **`PointBadge`** с пропом `type: 'sp' | 'tp'` и `value?: number`. Тогда все перечисленные места рендерят один компонент вместо дублирования разметки и классов.

---

## 3. Тег команды / платформы (Web, Back, QA, DevOps)

**Паттерн:** цвет по команде: Web — sky, Back — emerald, QA — amber, DevOps — violet.

**Где встречается:**

- `TaskCardTags.tsx` — константы `TEAM_TAG_BG`, `TEAM_TAG_BORDER`, экспорт **`getTeamTagClasses(team)`**, используется в карточке и в `OccupancyPhaseBar`.
- `TaskSidebarCard.tsx` — инлайн: `tag === 'Web' ? 'bg-sky-500' : tag === 'Back' ? 'bg-emerald-500' : 'bg-amber-500'`.
- `feature-planner/TaskCard.tsx` — то же инлайн-сопоставление.
- `TaskBadges.tsx` — `platform === 'Web' ? 'bg-sky-500 dark:bg-sky-600' : ...` (плюс Back, QA, violet).
- `TaskDetailsPanel.tsx` — то же для тегов.
- `TaskContextMenu.tsx` — те же цвета для команд.
- `GeneralInfoTab.tsx` — точки-индикаторы `bg-sky-500`, `bg-emerald-500`, `bg-amber-500`.

**Рекомендация:**

- Вынести маппинг «команда → классы» в одно место: либо оставить **`getTeamTagClasses`** в `TaskCardTags` и импортировать оттуда, либо перенести в `utils/teamColors.ts` / `components/TeamTag.tsx`.
- Ввести **`TeamTag`** в `components/`: проп `team: string`, рендер `<span className={getTeamTagClasses(team)}>{team}</span>`.
- Заменить инлайн-разметку в `TaskSidebarCard`, feature-planner `TaskCard`, `TaskBadges`, `TaskDetailsPanel`, `TaskContextMenu` на `<TeamTag team={...} />` и при необходимости использовать `getTeamTagClasses` для индикаторов (как в GeneralInfoTab).

---

## 4. Тег статуса

**Паттерн:** бейдж с цветом по статусу задачи.

**Уже есть:** **`StatusTag`** в `components/StatusTag.tsx` (использует `getStatusColors`, `translateStatus`). Используется в TaskCardTags, SprintSelector, OccupancyParentRow, PhaseTooltip, OccupancyTaskCell.

**Дублирование:**

- **`TaskBadges.tsx`** — вручную собирает классы из `getStatusColors` (tagBg, tagBgDark, замена bg→border и т.д.) и рендерит свой `<span>`. Лучше использовать **`<StatusTag status={item.originalStatus} />`** (при необходимости донастроить размер через `className`).
- **`TaskSidebarCard.tsx`** — при `showStatus && status` рендерит `<span className={...statusColors.tagBg}>`. Можно заменить на **`<StatusTag status={status} className="..." />`**.
- **`feature-planner/TaskCard.tsx`** — свой `<span className={statusColors.tagBg}>`. Аналогично заменить на **`StatusTag`**.

**Рекомендация:** везде, где рисуется «бейдж статуса», использовать **`StatusTag`**; при необходимости расширить пропсы (например, `size: 'sm' | 'md'`) для квартального плана и feature-planner.

---

## 5. Карточки задач (TaskCard)

**Текущее состояние:**

- **`features/task/components/TaskCard/`** — основная карточка для задач трекера (спринт, бэклог, канбан, сайдбар). Используется из многих фич.
~**`features/feature-planner/components/TaskCard.tsx`** — отдельная карточка для **FeatureTask** (редактирование названия, свои колбэки, другой набор полей). Специально использует **`getTaskCardStyles(mappedTask, 'swimlane')** из task feature, чтобы визуально быть похожей на спринт-карточку, но это другой компонент по смыслу.~

**Дублирование:** не столько «два TaskCard», сколько общие куски разметки:

- Блок бейджей (SP, TP, теги команд, статус) — см. пункты 2–4; при вводе `PointBadge`, `TeamTag`, `StatusTag` оба TaskCard’а могут их переиспользовать.
~**`TaskSidebarCard`** (task feature) и список в feature-planner (TasksWithoutSprintSidebar, Track, SprintSection) — в сайдбаре feature-planner используется **`TaskCard` из feature-planner**, в квартальном планировании — **`TaskSidebarCard`**. Логика разная, но бейджи можно унифицировать.~

**Рекомендация:** не объединять сами карточки в один компонент (разные домены и пропсы). Сократить дублирование за счёт общих **бейджей/тегов** (п. 2–4).

---

## 6. Обычное текстовое поле (input / textarea)

**Паттерн:** один и тот же набор классов для полей ввода в модалках и формах.

**Где встречается:** повторяющиеся классы вида  
`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500`  
в:

- `AvailabilityEditModal.tsx` (несколько полей),
- `DraftTaskModal.tsx`,
- `PhaseEditModal.tsx`,
- `ParticipantsModal.tsx` (поиск),
- `TasksSidebar.tsx` (поиск),
- `QuarterlyPlanningHeader.tsx` (кнопки-фильтры по стилю похожи на инпуты).

**Рекомендация:** ввести в `components/` базовый **`Input`** (и при необходимости **`TextArea`**):

- Пропсы: `value`, `onChange`, `placeholder?`, `className?`, `disabled?`, `type?`, для textarea — `rows?`.
- Дефолтные классы — как выше, с возможностью доп. `className` для размеров/отступов.
- Заменить повторяющиеся инпуты в перечисленных модалках и сайдбаре на `<Input />` / `<TextArea />`.

---

## 7. Селекты / выпадающие списки

**Паттерн:** кастомный селект (не нативный `<select>`).

**Где встречается:**

- **`CustomSelect`** в `SprintPlanner/components/CustomSelect.tsx` — используется для выбора режима отображения (по задачам / по исполнителям / канбан).
- В других местах могут быть свои реализации (кнопки-табы, списки с выбором).

**Рекомендация:** если появятся ещё 1–2 места с таким же «dropdown по клику» и выбором значения — вынести **`CustomSelect`** в `components/` и переиспользовать. Пока дублирования мало, можно оставить как есть и при следующем появлении селекта перенести в shared.

---

## 8. Кнопки в стиле «вторичных» (серая обводка, hover)

**Паттерн:** кнопка с классами типа  
`bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700`.

**Где встречается:**  
`QuarterlyPlanningHeader.tsx`, `TaskRow.tsx`, `TaskColumn.tsx`, `TasksSidebar.tsx`, `PhaseEditModal.tsx`, `DraftTaskModal.tsx` (кнопки «Отмена» / вторичные действия).

**Рекомендация:** при желании унифицировать кнопки ввести **`Button`** в `components/` с вариантами `variant: 'primary' | 'secondary' | 'ghost'` и использовать в формах/модалках. Не обязательно в первую очередь; можно сделать после SearchInput и бейджей.

---

## Приоритеты внедрения

1. **Высокий:** **SearchInput** — много одинаковых поисковых полей, быстро снижает дублирование.
2. **Высокий:** **PointBadge** (SP/TP) и **TeamTag** + перенос/общий **getTeamTagClasses** — используются в 4+ местах, единый вид бейджей.
3. **Средний:** везде использовать **StatusTag** (заменить ручной рендер в TaskBadges, TaskSidebarCard, feature-planner TaskCard).
4. **Средний:** базовый **Input** (и при необходимости **TextArea**) для модалок и форм.
5. **Низкий:** вынос **CustomSelect** в `components/` при появлении ещё использований; вариант **Button** для вторичных действий.

---

## Выполнено (февраль 2025)

- **SearchInput** — компонент `components/SearchInput.tsx` (size: sm | md). Замены: SidebarFilters, TasksTabFilters, SprintPlannerControlsBar, DocumentSearch, FeaturesListFilters, TasksSidebar, QuarterlySprintsTimeline, ParticipantsModal.
- **PointBadge** — `components/PointBadge.tsx` (type: 'sp' | 'tp', value, compact?). **TeamTag** — `components/TeamTag.tsx`. **getTeamTagClasses** и константы — `utils/teamColors.ts`. Замены: TaskSidebarCard, feature-planner TaskCard, TaskBadges; TaskCardTags импортирует из `utils/teamColors`, реэкспорт оставлен для совместимости.
- **StatusTag** везде: в TaskBadges, TaskSidebarCard, feature-planner TaskCard ручной рендер статуса заменён на `<StatusTag />`.
- **Input** и **TextArea** — `components/Input.tsx`, `components/TextArea.tsx`. Замены: AvailabilityEditModal (даты), PhaseEditModal (даты), DraftTaskModal (название, описание, storyPoints, testPoints).
- **Button** — `components/Button.tsx` (variant: primary | secondary | danger | ghost, fullWidth?). Замены: AvailabilityEditModal, PhaseEditModal, DraftTaskModal, ParticipantsModal, TransitionFieldsModal, FinishSprintModal, AutoPlanModal, CreateSprintModal, GroomingTab (кнопки «Отмена», «Сохранить», «Удалить» и т.д.).
- **CustomSelect** — перенесён в `components/CustomSelect.tsx`. Импорты обновлены в SprintPlannerControlsBar, SettingsModal, TransitionFieldsModal. Старый файл в SprintPlanner удалён.
- **TaskDetailsPanel** — бейджи SP/TP, теги платформ и статус заменены на PointBadge, TeamTag, StatusTag.
- **TaskContextMenu** — локальная функция getTagColor заменена на getTeamTagClasses из `utils/teamColors`.
- **GeneralInfoTab** — индикаторы платформ (точки Веб/Бэкенд/QA) переведены на TEAM_TAG_BG для единого вида и поддержки dark.
- **TaskCardTags** — внутренние span’ы SP/TP/команда заменены на PointBadge (в т.ч. compact) и TeamTag с переменными размерами (tagPadding, tagTextSize, tagRounding).
- **Select** — компонент `components/Select.tsx` с теми же базовыми классами, что и Input. Замены: AvailabilityEditModal (участник), DraftTaskModal (родитель), AutoPlanModal (эпик SLA), FinishSprintTaskTransfer (спринт), AccountWorkForm (спринт).
- **Secondary-кнопки вне модалок** — заменены на `<Button variant="secondary">`: TasksSidebar (Раскрыть/Свернуть, Загрузить старые элементы), QuarterlyPlanningHeader (Участники), TaskRow (Сортировать), TaskColumn (Раскрыть/Свернуть).
- **Оставшиеся инпуты/текстареи** — TransitionFieldsModal (Input/TextArea для полей формы), AccountWorkForm (Input, TextArea, Select, Button), GroomingTab (TextArea с ref). В TextArea добавлен forwardRef для поддержки ref.
- **Последние инпуты с длинными классами** — заменены на Input: AutoPlanModal (дата, число «Ресурс на ошибки»), GeneralInfoTab (название эпика, 3 поля ответственных), CreateSprintModal (название спринта, даты начала/конца), FinishSprintChat (название/ID чата).
