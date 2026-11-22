# Каталог тест-кейсов

Источник правды для регресса: что пользователь может сделать в продукте и что должно получиться. По этому каталогу пишутся автотесты в [`e2e/`](../e2e/) и проводится ручная проверка на боевом контуре. Как запускать и как работать с каталогом — [AGENT_TESTING_GUIDE.md](./AGENT_TESTING_GUIDE.md).

Формат проверяет `pnpm check:e2e-cases` (входит в `pnpm test`), поэтому держите его строго:

```markdown
### TC-NNN: Короткое название
- Контур: демо | боевой
- Код: путь/к/папке/, путь/к/файлу.tsx
- Шаги: что сделать.
- Ожидаемо: что должно получиться.
- Автотест: e2e/functional/файл.spec.ts | нет — причина
```

- **Контур.** `демо` — проходит целиком на `/demo/planner` (фикстуры, без логина). `боевой` — пишет в трекер или PostgreSQL, нужен логин.
- **Код.** Папки (со `/` на конце) или файлы, которые реализуют поведение. Сопоставление идёт по префиксу пути. По этому полю `pnpm e2e:affected` находит кейсы, которые задевает текущий diff. Путей должно быть столько, чтобы правка поведения попадала в кейс, но не вся папка `features/`.
- **Автотест.** Спека, в которой есть тест с названием, начинающимся с `TC-NNN`. Один тест может закрывать несколько кейсов: `TC-040/041: …`. Если демо-кейс не автоматизирован, причина обязательна.
- Номера не переиспользуются: у удалённого кейса номер не занимать.

---

## 1. Выбор доски

### TC-001: Страница выбора доски
- Контур: боевой
- Код: app/select-board/
- Шаги: открыть приложение без сохранённой доски или перейти на `/select-board`.
- Ожидаемо: список досок организации из подключённого трекера.
- Автотест: нет — боевой контур

### TC-002: Выбор доски
- Контур: боевой
- Код: app/select-board/
- Шаги: кликнуть на доску, дождаться загрузки.
- Ожидаемо: переход на `/planner/:boardId/sprint/:sprintId`, открыта «Доска»; выбран спринт `in_progress`, иначе первый в списке; в шапке название доски.
- Автотест: нет — боевой контур

### TC-003: Смена доски
- Контур: демо
- Код: components/PageHeaderBoardSelector.tsx
- Шаги: в шапке открыть селектор доски, выбрать другую.
- Ожидаемо: загружаются спринты новой доски, выбранный спринт обновляется.
- Автотест: нет — очередь автоматизации

## 2. Спринты и вкладки

### TC-010: Переключение вкладок
- Контур: демо
- Код: components/PageHeaderMainPageTabs.tsx, components/PageHeaderBoardToolbar.tsx, app/demo/
- Шаги: по очереди открыть «Бэклог», «Роадмап», «Диаграмма сгорания», «Ретро», «Метрики», «Доска».
- Ожидаемо: открывается экран вкладки, вкладка отмечена текущей (`aria-current="page"`); на боевом контуре меняется `?tab=`.
- Автотест: e2e/functional/tabs.spec.ts

### TC-011: Выбор спринта
- Контур: демо
- Код: features/sprint/components/SprintPlanner/components/
- Шаги: на «Доске» в селекторе спринта выбрать другой спринт.
- Ожидаемо: загружаются задачи спринта, перестраиваются свимлейны и сайдбар.
- Автотест: нет — очередь автоматизации

### TC-012: Режимы доски
- Контур: демо
- Код: features/sprint/components/SprintPlanner/kanban/, features/sprint/components/SprintPlanner/feature-lanes/, features/swimlane/
- Шаги: в переключателе режима выбрать «Канбан», затем «По фичам».
- Ожидаемо: по исполнителям — строки людей; канбан — колонки статусов и нет кнопок отмены/повтора плана; по фичам — строки фич.
- Автотест: e2e/functional/boardModes.spec.ts

### TC-013: Канбан — статус без колонки доски
- Контур: демо
- Код: features/sprint/components/SprintPlanner/kanban/kanbanGroupTasksHelpers.ts, features/sprint/components/SprintPlanner/kanban/KanbanView.tsx
- Шаги: открыть «Канбан»; найти задачу в статусе, для которого у доски нет колонки («Need info»); перетащить в эту колонку другую задачу.
- Ожидаемо: у статуса своя колонка с его названием после колонок доски, а не «Без статуса»; «Без статуса» — только для задач без статуса; перенос в колонку меняет статус задачи.
- Автотест: e2e/functional/kanban.spec.ts

### TC-014: Поиск по доске при смене режима
- Контур: демо
- Код: features/task/utils/taskMatchesNameFilter.ts, features/sprint/components/SprintPlanner/kanban/, features/task/components/TaskBar/taskBarHelpers.ts
- Шаги: на свимлейне ввести поиск по названию, переключиться на «Канбан».
- Ожидаемо: в обоих режимах карточки, не подходящие под поиск, приглушены, но не пропадают; счётчики колонок канбана — по всем задачам. Правило совпадения одно: название, ключ или имя исполнителя.
- Автотест: e2e/functional/kanban.spec.ts

## 3. Планирование на свимлейне

### TC-020: Отображение свимлейна
- Контур: демо
- Код: features/swimlane/
- Шаги: открыть «Доску» в режиме «По исполнителям».
- Ожидаемо: строка на каждого исполнителя, 10 рабочих дней по 3 ячейки; выходные заштрихованы.
- Автотест: нет — покрыт визуальным снимком `board`, функциональная проверка в очереди

### TC-021: Перетаскивание задачи из сайдбара
- Контур: демо
- Код: features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts, features/sidebar/, features/task/components/DraggableTask/
- Шаги: на вкладке сайдбара «Задачи» перетащить задачу в ячейку исполнителя.
- Ожидаемо: карточка появляется в выбранной ячейке, задача уходит из списка незапланированных, счётчик вкладки «Задачи» уменьшается.
- Автотест: e2e/functional/swimlaneDnd.spec.ts

### TC-022: Перемещение между исполнителями и днями
- Контур: демо
- Код: features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts, features/task/components/TaskBar/
- Шаги: перетащить карточку в строку другого исполнителя, затем на другой день.
- Ожидаемо: карточка перемещается, позиция обновляется.
- Автотест: e2e/functional/swimlaneDnd.spec.ts

### TC-023: Изменение длительности
- Контур: демо
- Код: features/task/components/TaskBar/
- Шаги: потянуть за край карточки.
- Ожидаемо: правый край меняет длительность, левый — начало и длительность; карточка у конца спринта за его границу не растягивается.
- Автотест: e2e/functional/swimlaneDnd.spec.ts

### TC-024: Возврат в сайдбар
- Контур: демо
- Код: features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts, features/context-menu/
- Шаги: в контекстном меню карточки выбрать «Удалить из плана»; другую карточку перетащить со свимлейна на сайдбар.
- Ожидаемо: карточка исчезает со свимлейна, задача снова в списке незапланированных, счётчик вкладки «Задачи» растёт.
- Автотест: e2e/functional/swimlaneDnd.spec.ts

### TC-025: Отмена и повтор
- Контур: демо
- Код: features/sprint/components/SprintPlanner/components/
- Шаги: переместить карточку, нажать «Отменить», затем «Повторить».
- Ожидаемо: позиция откатывается и возвращается.
- Автотест: e2e/functional/swimlaneDnd.spec.ts

### TC-026: Сохранение позиций
- Контур: боевой
- Код: lib/layers/application/mobx/stores/, hooks/useTaskPositionsApi.ts
- Шаги: переместить карточку, перезагрузить страницу.
- Ожидаемо: карточка на новом месте (позиции хранятся в PostgreSQL).
- Автотест: нет — боевой контур

### TC-027: Фото-карточка — отмена обрезки
- Контур: демо
- Код: features/task/components/TaskBar/components/quickAddMenu/usePlannerImageDraftFile.ts, features/task/components/TaskBar/components/quickAddMenu/PlannerImageCropperDialog.tsx, features/task/components/TaskCard/components/TaskCardSwimlaneImageDraftEditor.tsx
- Шаги: в панели инструментов выбрать «Карточки», кликнуть по свободной ячейке, выбрать картинку; в окне обрезки нажать «Отмена» (или Escape).
- Ожидаемо: окно закрывается, картинка остаётся в черновике без обрезки, её можно обрезать позже кнопкой на фото.
- Автотест: e2e/functional/swimlanePhoto.spec.ts

### TC-028: Бросок мимо доски
- Контур: демо
- Код: features/sprint/components/SprintPlanner/sprintPlannerCollisionDetection.ts
- Шаги: взять карточку со свимлейна и отпустить над шапкой страницы, выше доски.
- Ожидаемо: карточка остаётся на прежнем месте и у прежнего исполнителя, в историю правок ничего не пишется.
- Автотест: e2e/functional/swimlaneDnd.spec.ts

### TC-029: Пустой черновик заметки не пропадает сам
- Контур: демо
- Код: features/task/hooks/pendingTaskStatus.ts, features/task/hooks/useSprintTasksBackgroundRefresh.ts, features/task/hooks/useTasks.ts, lib/layers/application/mobx/stores/taskPositionsStoreLoadHelpers.ts
- Шаги: выбрать «Заметка», кликнуть по свободной ячейке, ничего не вводить; подождать дольше минуты (фоновое обновление задач) или дождаться правки коллеги (realtime).
- Ожидаемо: черновик остаётся на месте, пока его не сохранят, не удалят или не нажмут Escape.
- Автотест: e2e/functional/swimlaneNotes.spec.ts

### TC-104: Заметка из быстрого добавления сохраняется
- Контур: демо
- Код: features/sprint/components/SprintPlanner/hooks/useSprintPlannerQuickAddDraft.ts, features/sprint/components/SprintPlanner/hooks/useSprintPlannerQuickAddIssueActions.ts, features/sprint/components/SprintPlanner/hooks/useSprintPlannerViewModelInteractions.ts, features/sprint/components/SprintPlanner/SprintPlannerView.tsx, features/sprint/components/SprintPlanner/utils/swimlanesSectionSwimlanePropsHelpers.ts, features/swimlane/components/TaskLayerPlanSegmentItem.tsx, features/task/components/TaskBar/components/quickAddMenu/types.ts
- Шаги: выбрать «Заметка», кликнуть по свободной ячейке, ввести текст в черновик и нажать «Подтвердить» на панели черновика.
- Ожидаемо: на месте черновика появляется сохранённая заметка с введённым текстом, черновик исчезает.
- Автотест: e2e/functional/swimlaneNotes.spec.ts

### TC-133: Встроенный трекер — ключи задач без ссылок
- Контур: демо
- Код: lib/issueTrackerProvider/issueTrackerUi.ts, features/task/components/TaskCard/slots/TaskCardSlotItem.tsx, features/task/components/TaskCard/components/TaskCardSidebarContent.tsx, features/task/components/TaskInfoSidebar/TaskInfoSidebarHeader.tsx, features/context-menu/components/ContextMenu/components/ContextMenuCopyQuickActions.tsx, features/swimlane/components/FeatureLaneRowTitle.tsx, features/sprint/components/SprintPlanner/kanban/KanbanLaneHeaderTitle.tsx, features/sidebar/components/tabs/InvalidTab.tsx, app/demo/planner/DemoPlannerClient.tsx
- Шаги: открыть `/demo/planner?tracker=otorva` (экраны как при встроенном трекере), посмотреть ключ на карточке, открыть меню карточки; затем то же в обычном демо.
- Ожидаемо: при встроенном трекере ключ задачи — текст, а не ссылка «открыть в трекере» (у трекера нет веб-интерфейса), в меню карточки есть «скопировать ключ», но нет «скопировать ссылку»; очередь и родитель в панели задачи — текстом. В обычном демо (Яндекс Трекер) ключ — ссылка, «скопировать ссылку» есть.
- Автотест: e2e/functional/builtInTracker.spec.ts

### TC-134: Встроенный трекер — онбординг и вход по email и паролю
- Контур: боевой
- Код: app/register/RegisterForm.tsx, app/register/RegisterFormFields.tsx, app/register/RegisterTrackerCredentials.tsx, app/auth-setup/page.tsx, app/auth-setup/AuthSetupCardInner.tsx, app/auth-setup/AuthSetupOtorvaSection.tsx, components/OtorvaCredentialsFields.tsx, components/IssueTrackerConnectionFields.tsx, app/api/auth/otorva/session/route.ts, lib/auth/otorvaCredentials.ts
- Шаги: на пустой установке открыть `/register`, выбрать «Встроенный трекер», указать организацию, имя, email и пароль; в новом браузере войти на `/auth-setup` по тем же email и паролю, сначала с неверным паролем.
- Ожидаемо: при регистрации поля адреса API и токена нет — только имя, email и пароль; создаётся организация, её администратор и первый администратор встроенного трекера, открывается админка; неверный пароль — «Неверный email или пароль», без входа; верный — выбор команды.
- Автотест: e2e/stand/onboarding.spec.ts

### TC-131: Упоминания в заметке
- Контур: демо
- Код: features/comments/hooks/useStickyNoteRichEditorMentions.ts, features/task/components/TaskBar/components/quickAddMenu/CommentMentionSelector.tsx, features/comments/components/StickyNoteRichEditor.tsx
- Шаги: в черновике заметки набрать «@»; нажать Escape; развернуть заметку в режим фокуса, набрать «@», выбрать человека мышью; вернуть заметку на доску, кликнуть по упоминанию и набрать текст.
- Ожидаемо: список людей один, имена видны целиком даже у узкой заметки; Escape закрывает список, черновик и текст остаются; выбранный человек вставляется упоминанием, список закрывается; после клика по упоминанию набор появляется сразу за ним.
- Автотест: e2e/functional/swimlaneNotes.spec.ts

### TC-132: Меню быстрого добавления — новая задача и задача из трекера
- Контур: демо
- Код: features/task/components/TaskBar/components/quickAddMenu/SwimlaneQuickAddMenu.tsx, features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuNewPanel.tsx, features/task/components/TaskBar/components/quickAddMenu/QuickAddMenuExistingPanel.tsx, features/task/components/TaskBar/components/quickAddMenu/useQuickAddMenuNavigation.ts, features/task/components/TaskBar/components/quickAddMenu/types.ts, features/swimlane/components/taskLayerPlanSegmentQuickAddMenu.ts
- Шаги: выбрать инструмент «Задача», кликнуть по свободной ячейке; в меню выбрать «Новая задача», ввести название; нажать «Назад», выбрать «Из трекера», набрать запрос; закрыть меню.
- Ожидаемо: меню предлагает новую задачу и задачу из трекера; в форме новой задачи есть тип, очередь доски и родитель, «Создать» неактивна до ввода названия; введённое название сразу видно на карточке-черновике; «Назад» возвращает к выбору и очищает черновик; в виде «Из трекера» — поле поиска с запросом; «Закрыть» убирает черновик с доски. Создание задачи в трекере на демо не проверяется — трекера там нет.
- Автотест: e2e/functional/swimlaneQuickAdd.spec.ts

## 3а. Стенд регресса: встроенный трекер

Кейсы ниже идут на стенде `pnpm e2e:stand` (пустые база планера и otorva, сид из фикстур демо, настоящие часы) — по порядку на одной базе: онбординг (TC-134), сид, команда (TC-135), дальше сценарии планера с записью в трекер.

### TC-135: Команда на доске встроенного трекера с составом из трекера
- Контур: боевой
- Код: app/admin/teams/, features/admin/, lib/staffTeams/, lib/issueTrackerProvider/otorvaPlanning.ts
- Шаги: в админке «Команды» добавить команду с очередью и доской встроенного трекера; в её составе добавить людей вкладкой «Новый из встроенного трекера» с ролями; открыть выбор команды.
- Ожидаемо: очереди, доски и люди приходят из встроенного трекера; команда добавляется («Команда добавлена»), участники видны в составе; на выборе команды она открывает планер текущего спринта.
- Автотест: e2e/stand/onboarding.spec.ts

### TC-136: Задачи спринта из встроенного трекера
- Контур: боевой
- Код: lib/issueTrackerProvider/otorvaIssues.ts, lib/issueTrackerProvider/otorvaApi.ts, app/api/tracker/
- Шаги: открыть планер команды на текущем спринте.
- Ожидаемо: на доске и в сайдбаре — ровно задачи спринта трекера (задач бэклога нет); статусы — из workflow трекера («в работе»); ключ задачи — текст без ссылки.
- Автотест: e2e/stand/planner.spec.ts

### TC-137: Раскладка на настоящем бэкенде переживает перезагрузку
- Контур: боевой
- Код: features/swimlane/, features/sprint/model/, app/api/sprints/[sprintId]/positions/, lib/sprints/taskPositionsRepository.ts
- Шаги: перетащить задачу из сайдбара в строку исполнителя; перезагрузить страницу.
- Ожидаемо: позиция сохраняется в базе планера и после перезагрузки карточка стоит в той же строке и ячейке.
- Автотест: e2e/stand/planner.spec.ts

### TC-138: Новая задача из быстрого добавления создаётся в трекере
- Контур: боевой
- Код: features/task/components/TaskBar/components/quickAddMenu/, app/api/issues/route.ts, lib/issueTrackerProvider/otorvaWrites.ts
- Шаги: инструмент «Задача», клик по свободной ячейке человека, «Новая задача», ввести название, «Создать».
- Ожидаемо: в трекере появляется задача в очереди доски, в текущем спринте, с исполнителем строки; на доске — её карточка с ключом трекера.
- Автотест: e2e/stand/planner.spec.ts

### TC-139: Смена статуса из меню карточки уходит в трекер
- Контур: боевой
- Код: features/context-menu/, app/api/issues/[issueKey]/status/, lib/issueTrackerProvider/otorvaWrites.ts
- Шаги: в меню карточки «Изменить статус» → следующий статус workflow.
- Ожидаемо: статус задачи в трекере меняется на выбранный, карточка показывает новый статус.
- Автотест: e2e/stand/planner.spec.ts

### TC-140: Перенос задачи в другой спринт меняет состав спринта в трекере
- Контур: боевой
- Код: features/context-menu/, app/api/issues/[issueKey]/sprint/, lib/sprints/issueSprintMove.ts, lib/issueTrackerProvider/otorvaWrites.ts
- Шаги: в меню карточки «Перенести в другой спринт» → следующий спринт → «В бэклог спринта».
- Ожидаемо: в трекере задача уходит из текущего спринта в выбранный (спринты той же доски заменяются, а не копятся); с доски текущего спринта карточка пропадает.
- Автотест: e2e/stand/planner.spec.ts

## 4. Бэклог

### TC-030: Отображение бэклога
- Контур: демо
- Код: features/backlog/
- Шаги: открыть вкладку «Бэклог».
- Ожидаемо: колонка «Бэклог», колонки спринтов, «Завершенные спринты»; работают поиск, фильтры по статусу и исполнителям.
- Автотест: нет — экран покрыт визуальным снимком `backlog`, фильтры в очереди

### TC-031: Из бэклога в спринт
- Контур: демо
- Код: features/backlog/
- Шаги: перетащить задачу из колонки «Бэклог» в колонку спринта.
- Ожидаемо: задача появляется в спринте и пропадает из бэклога.
- Автотест: нет — очередь автоматизации

### TC-032: Из спринта в бэклог
- Контур: демо
- Код: features/backlog/
- Шаги: перетащить задачу из колонки спринта в «Бэклог».
- Ожидаемо: задача уходит из спринта и появляется в бэклоге.
- Автотест: нет — очередь автоматизации

### TC-033: Массовый перенос
- Контур: демо
- Код: features/backlog/components/BacklogBulkToolbar.tsx, features/backlog/components/BacklogBulkSprintMenu.tsx
- Шаги: выделить несколько задач, в панели массовых действий выбрать «В спринт» или «В бэклог».
- Ожидаемо: задачи перенесены, тост с количеством.
- Автотест: нет — очередь автоматизации

### TC-034: Фильтр по исполнителю
- Контур: демо
- Код: features/backlog/components/BacklogAssigneeFilter.tsx
- Шаги: в «Бэклоге» в фильтре «Filter by assignee» нажать на аватар человека; навести на аватар.
- Ожидаемо: кнопка названа именем человека и отмечена нажатой, в колонках остаются только его задачи; при наведении меняется цвет кольца. Люди с фото стоят перед кружками с инициалами, остальные — за «+N» со списком имён. Тот же фильтр — в сайдбаре доски и в шапке канбана.
- Автотест: e2e/functional/backlogFilters.spec.ts

## 5. Цели спринта (вкладка сайдбара «Спринт»)

### TC-040: Отображение целей
- Контур: демо
- Код: features/sidebar/components/SprintGoalsSection.tsx, features/sidebar/components/GoalsList.tsx
- Шаги: на «Доске» открыть сайдбар, вкладка «Спринт».
- Ожидаемо: блоки «Цели Delivery» и «Цели Discovery», бейдж прогресса на вкладке.
- Автотест: e2e/functional/sprintGoals.spec.ts

### TC-041: Отметка цели
- Контур: демо
- Код: features/sidebar/components/GoalItemBody.tsx, features/sidebar/components/GoalItem.tsx
- Шаги: кликнуть чекбокс цели.
- Ожидаемо: цель отмечена, прогресс на вкладке обновлён.
- Автотест: e2e/functional/sprintGoals.spec.ts

### TC-042: Добавление цели
- Контур: боевой
- Код: features/sidebar/components/SprintGoalsSection.tsx
- Шаги: «Добавить цель», ввести текст, Enter.
- Ожидаемо: цель появляется в списке.
- Автотест: нет — правка целей только у админа организации, в демо её нет

### TC-043: Редактирование цели
- Контур: боевой
- Код: features/sidebar/components/GoalItemReadonlyOrDisplay.tsx, features/sidebar/components/GoalItemDisplayPanel.tsx
- Шаги: кликнуть по тексту цели, изменить, Enter (Esc — отмена).
- Ожидаемо: текст обновлён.
- Автотест: нет — правка целей только у админа организации, в демо её нет

### TC-044: Удаление цели
- Контур: боевой
- Код: features/sidebar/components/GoalItemDisplayPanel.tsx
- Шаги: кнопка «Удалить» у цели, подтвердить «Удалить эту цель?».
- Ожидаемо: цель удалена.
- Автотест: нет — правка целей только у админа организации, в демо её нет

### TC-045: Сохранение целей
- Контур: боевой
- Код: lib/sprintGoals/
- Шаги: выполнить TC-041…TC-044, перезагрузить страницу.
- Ожидаемо: изменения на месте (таблица `sprint_goals` в PostgreSQL).
- Автотест: нет — боевой контур

## 6. Задачи

### TC-050: Информация о задаче
- Контур: демо
- Код: features/task/components/TaskInfoSidebar/, features/context-menu/
- Шаги: правый клик по карточке → «Информация о задаче».
- Ожидаемо: боковая панель: название, описание, статус, исполнитель, story points / test points.
- Автотест: нет — очередь автоматизации

### TC-051: Изменение статуса
- Контур: боевой
- Код: features/context-menu/components/StatusSubmenu.tsx, features/task/components/TaskStatusSelect.tsx
- Шаги: правый клик → «Изменить статус» → выбрать переход.
- Ожидаемо: статус обновлён в интерфейсе и в трекере.
- Автотест: нет — боевой контур

### TC-052: Изменение оценки
- Контур: боевой
- Код: features/context-menu/components/EstimateSubmenu.tsx
- Шаги: правый клик → «Изменить оценку», ввести story points / test points.
- Ожидаемо: оценка обновлена в интерфейсе и в трекере.
- Автотест: нет — боевой контур

### TC-053: Перенос в другой спринт
- Контур: боевой
- Код: features/context-menu/components/SprintSubmenu.tsx
- Шаги: правый клик → «Перенести в другой спринт» → выбрать спринт, подтвердить.
- Ожидаемо: задача пропадает из текущего спринта и появляется в выбранном.
- Автотест: нет — боевой контур

## 7. Диаграмма сгорания

### TC-070: Отображение графика
- Контур: демо
- Код: features/burndown/
- Шаги: открыть вкладку «Диаграмма сгорания».
- Ожидаемо: график с линией «Плановая сходимость» и остатком SP/TP, плитки метрик.
- Автотест: нет — покрыт визуальным снимком `burndown`

### TC-071: Смена спринта на графике
- Контур: демо
- Код: features/burndown/
- Шаги: в селекторе спринта выбрать другой спринт.
- Ожидаемо: график перестраивается.
- Автотест: нет — очередь автоматизации

### TC-072: Тултип дня
- Контур: демо
- Код: features/burndown/components/BurndownChartPinnedTooltipOverlay.tsx, features/burndown/components/BurndownChartCustomTooltip.tsx
- Шаги: навести на точку графика, кликнуть.
- Ожидаемо: тултип с метриками дня и ченжлогом закрепляется; закрывается кнопкой «Закрыть тултип».
- Автотест: нет — очередь автоматизации

## 8. Ретро

### TC-080: Отображение доски ретро
- Контур: демо
- Код: features/retro/components/RetroPage.tsx, features/retro/components/RetroBoardView.tsx
- Шаги: открыть вкладку «Ретро».
- Ожидаемо: колонки ретро по шаблону организации, блок фактов спринта.
- Автотест: e2e/functional/retroCards.spec.ts

### TC-081: Карточки ретро
- Контур: демо
- Код: features/retro/components/RetroColumnComposer.tsx, features/retro/components/RetroCardView.tsx, features/retro/components/RetroColumnView.tsx
- Шаги: в колонке «Добавить карточку», ввести текст, Enter; затем удалить карточку.
- Ожидаемо: карточка появляется и удаляется, счётчик колонки обновляется.
- Автотест: e2e/functional/retroCards.spec.ts

### TC-082: Колонки ретро
- Контур: демо
- Код: features/retro/components/RetroColumnHeader.tsx
- Шаги: «Добавить колонку», переименовать, сдвинуть влево/вправо, удалить (подтверждение).
- Ожидаемо: колонки меняются соответственно.
- Автотест: нет — очередь автоматизации

### TC-083: Комментарии ретро
- Контур: демо
- Код: features/retro/components/RetroCardComments.tsx, features/retro/components/RetroCommentItem.tsx
- Шаги: открыть комментарии карточки, отправить комментарий, удалить его.
- Ожидаемо: комментарий появляется и удаляется, счётчик обновляется.
- Автотест: нет — очередь автоматизации

### TC-085: Реакции ретро
- Контур: демо
- Код: features/retro/retroIdentity.ts, features/retro/RetroCardActionsContext.tsx, features/retro/components/RetroNoteCard.tsx
- Шаги: добавить карточку, навести, «Добавить реакцию», выбрать эмодзи.
- Ожидаемо: на карточке чип реакции, отмечен как свой; повторное нажатие снимает. В демо реакцию ставит фикстурный участник (сессии трекера нет).
- Автотест: e2e/functional/retroCards.spec.ts

### TC-084: Сохранение ретро
- Контур: боевой
- Код: app/api/sprints/
- Шаги: изменить доску, перезагрузить страницу.
- Ожидаемо: изменения на месте (доска хранится в PostgreSQL).
- Автотест: нет — боевой контур

## 9. Метрики сайдбара

### TC-090: Объём по статусам
- Контур: демо
- Код: features/sidebar/components/tabs/MetricsTab.tsx, features/sprint/utils/sprintMetrics.ts
- Шаги: на «Доске» открыть вкладку сайдбара «Метрики», блок «По статусам».
- Ожидаемо: строки подписаны названиями статусов из трекера («In progress», «Need info»), а не ключами (`inProgress`); у каждой суммы SP и TP.
- Автотест: e2e/functional/sidebarMetrics.spec.ts

## 10. История спринта (вкладка сайдбара «История»)

### TC-100: Лента изменений спринта
- Контур: демо
- Код: features/sidebar/components/tabs/HistoryTab.tsx, features/sidebar/components/tabs/HistoryEventRow.tsx, features/sidebar/utils/sprintHistoryText.ts, lib/boardHistory/, lib/demo/demoFixtureHistory.ts
- Шаги: на «Доске» открыть вкладку сайдбара «История».
- Ожидаемо: события сгруппированы по дням, новые сверху; у каждого автор, время и что изменилось («Задача добавлена в спринт», «Срок: 20.10 → 22.10», «Цель отмечена выполненной»); у задачи — ключ и название, в том числе у снятой со спринта; у стрелки — что она связывает (ключ задачи, текст заметки в кавычках); правки агента помечены «через Claude»; правка без автора подписана «Неизвестно», в аватаре «?».
- Автотест: e2e/functional/sprintHistory.spec.ts

### TC-101: Фильтр ленты истории
- Контур: демо
- Код: features/sidebar/components/tabs/HistoryTab.tsx, features/sidebar/utils/sprintHistoryText.ts
- Шаги: во вкладке «История» переключить фильтры «Задачи», «Доска», «Агент», «Все».
- Ожидаемо: «Задачи» — только события из трекера, «Доска» — заметки, цели и стрелки, «Агент» — только правки через агента; «Все» возвращает полную ленту.
- Автотест: e2e/functional/sprintHistory.spec.ts

### TC-102: Переход от события к доске
- Контур: демо
- Код: features/sidebar/components/tabs/HistoryTab.tsx, features/sidebar/components/tabs/HistoryEventRow.tsx, features/sidebar/utils/sprintHistoryText.ts, features/sprint/hooks/usePlannerNotificationFocus.ts
- Шаги: во вкладке «История» нажать на событие задачи на доске, задачи вне доски, заметки и цели.
- Ожидаемо: доска прокручивается к карточке задачи или заметки, карточка подсвечивается на несколько секунд; задача спринта, не разложенная на доске, открывается в панели задачи; событие цели открывает вкладку «Спринт» с целями; удалённое и снятое со спринта не нажимается; у нажимаемой строки при наведении справа появляется стрелка.
- Автотест: e2e/functional/sprintHistory.spec.ts

### TC-103: Паспорт задачи в истории
- Контур: демо
- Код: features/task/components/TaskPassport/TaskPassport.tsx, features/sidebar/components/tabs/HistoryTaskPassportTooltip.tsx, features/sidebar/components/tabs/HistoryEventRow.tsx
- Шаги: во вкладке «История» навести курсор на ключ задачи спринта, затем на ключ задачи, снятой со спринта.
- Ожидаемо: через полсекунды рядом появляется паспорт задачи: ключ, статус, название, исполнитель, оценка, спринт, родитель, срок (пустые поля не показываются); для задачи вне спринта паспорт подгружается по ключу.
- Автотест: e2e/functional/sprintHistory.spec.ts

## 11. Настройки

### TC-110: Вкладки сайдбара в настройках
- Контур: демо
- Код: components/SettingsModal/components/SidebarTabsSettingsList.tsx, components/SettingsModal/tabs/SettingsGeneralTab.tsx, hooks/localStorage/hooksSidebarAndDevelopers.ts, features/sidebar/hooks/useSidebarHeaderTabs.ts
- Шаги: открыть «Настройки» → «Общие», раздел «Табы сайдбара спринта».
- Ожидаемо: в списке только вкладки, которые есть в сайдбаре планера: «Задачи», «Спринт», «Метрики», «История»; скрытая здесь вкладка пропадает из шапки сайдбара.
- Автотест: e2e/functional/settingsSidebarTabs.spec.ts

## 12. Роадмап (квартальный план)

### TC-120: Переключение квартала
- Контур: демо
- Код: features/quarterly-plan/components/QuarterlyPlanHeader.tsx, features/quarterly-plan/QuarterlyPlanPage.tsx, features/quarterly-plan/useQuarterlyPlan.ts
- Шаги: открыть вкладку «Роадмап», нажать «Следующий квартал», затем «Текущий».
- Ожидаемо: видны команды доски с направлениями и эпиками; в следующем квартале своего плана и строк текущего квартала нет; «Текущий» возвращает текущий квартал с его планом.
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-121: Новое направление и эпик
- Контур: демо
- Код: features/quarterly-plan/components/QuarterlyPlanTeamHeader.tsx, features/quarterly-plan/components/QuarterlyPlanDirectionHeader.tsx, features/quarterly-plan/components/QuarterlyPlanInlineInput.tsx, features/quarterly-plan/quarterlyPlanMenuSections.tsx, features/quarterly-plan/quarterlyPlanBoardModel.ts
- Шаги: у команды «Добавить направление», ввести название, Enter; у направления «Добавить эпик» → «Новый эпик», ввести название, Enter.
- Ожидаемо: направление и эпик появляются в плане; у нового эпика метка «Не запланировано».
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-122: Назначение человека на неделю
- Контур: демо
- Код: features/quarterly-plan/components/QuarterlyPlanEpicRow.tsx, features/quarterly-plan/components/QuarterlyPlanWeekCells.tsx, features/quarterly-plan/components/QuarterlyPlanMenu.tsx, features/quarterly-plan/quarterlyPlanMenuSections.tsx, features/quarterly-plan/quarterlyPlanBoardModel.ts
- Шаги: у незапланированного эпика нажать на клетку недели, в окне «Кто делает» выбрать человека.
- Ожидаемо: в строке полоса человека на эту неделю (фаза по умолчанию — Delivery); метка «Не запланировано» у эпика пропадает, счётчик незапланированных у направления уменьшается.
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-123: Удаление эпика из плана
- Контур: демо
- Код: features/quarterly-plan/quarterlyPlanMenuSections.tsx, features/quarterly-plan/QuarterlyPlanPage.tsx, features/quarterly-plan/quarterlyPlanBoardModel.ts
- Шаги: в меню «Действия» эпика выбрать «Убрать из плана», подтвердить.
- Ожидаемо: перед удалением — подтверждение, что в трекере ничего не меняется; после него строка и её полосы пропадают из плана.
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-124: Восстановление версии
- Контур: демо
- Код: features/quarterly-plan/components/QuarterlyPlanHistorySidebar.tsx, features/quarterly-plan/useQuarterlyPlanHistory.ts, features/quarterly-plan/useQuarterlyPlan.ts, lib/quarterlyPlans/
- Шаги: изменить план, открыть «История версий», выбрать прошлую версию, «Восстановить эту версию», закрыть историю, снова изменить план.
- Ожидаемо: выбранная версия показывается на доске только для чтения; после восстановления на доске она, а не последняя правка; следующая правка идёт поверх восстановленной версии и становится текущей версией.
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-126: Сворачивание и раскрытие строк
- Контур: демо
- Код: features/quarterly-plan/model/quarterBoardRows.ts, features/quarterly-plan/useQuarterDetail.ts, features/quarterly-plan/components/QuarterlyPlanBoard.tsx, features/quarterly-plan/components/QuarterlyPlanEpicGroup.tsx, features/quarterly-plan/components/QuarterlyPlanHeader.tsx
- Шаги: у эпика нажать счётчик задач, нажать ещё раз; свернуть команду; нажать счётчик проблем; переключить вид на «Дни», затем на «Недели».
- Ожидаемо: счётчик задач раскрывает и сворачивает задачи эпика; свёрнутая команда прячет свои строки, переход к проблеме в ней раскрывает её снова; «Дни» раскрывают задачи всех эпиков, «Недели» сворачивают.
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-127: Инструмент «Связь»
- Контур: демо
- Код: features/quarterly-plan/model/quarterLinkTool.ts, features/quarterly-plan/components/QuarterlyPlanLinksLayer.tsx, features/quarterly-plan/components/QuarterlyPlanBar.tsx, features/quarterly-plan/components/QuarterlyPlanToolbar.tsx
- Шаги: включить «Связь», нажать на одну полосу, затем на другую; удалить связь кнопкой у начала стрелки и подтвердить; выбрать полосу и дважды нажать Escape.
- Ожидаемо: между полосами появляется стрелка, инструмент остаётся включённым; после подтверждения стрелка пропадает; первый Escape снимает выбор полосы, второй выключает инструмент.
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-128: Заметки роадмапа
- Контур: демо
- Код: features/quarterly-plan/model/quarterNoteTool.ts, features/quarterly-plan/components/QuarterlyPlanNoteChip.tsx, features/quarterly-plan/components/QuarterlyPlanNoteInlineEditor.tsx, features/quarterly-plan/components/QuarterlyPlanNoteFocus.tsx, features/quarterly-plan/components/QuarterlyPlanWeekCells.tsx
- Шаги: включить «Заметка», нажать на неделю строки, ввести текст, подтвердить; открыть заметку, развернуть в режим фокуса, дописать, вернуть на доску, подтвердить; удалить заметку.
- Ожидаемо: после клика по неделе инструмент выключается и на доске открыт лист с курсором; подтверждённая заметка остаётся на доске; дописанное в режиме фокуса возвращается в лист и сохраняется; удалённая заметка пропадает.
- Автотест: e2e/functional/quarterlyPlan.spec.ts

### TC-125: Черновик агента
- Контур: боевой
- Код: features/quarterly-plan/useQuarterlyPlanAgent.ts, features/quarterly-plan/components/QuarterlyPlanAgentIsland.tsx, features/quarterly-plan/components/QuarterlyPlanDraftBar.tsx
- Шаги: агент через MCP предлагает правку плана; на доске принять черновик целиком или по пунктам либо отклонить.
- Ожидаемо: предложенные строки и полосы помечены как черновик; принятые становятся частью плана и попадают в историю версий с меткой «черновик агента»; отклонённые пропадают.
- Автотест: нет — черновик пишет внешний агент через MCP, в фикстурах демо его нет

## 13. Доступность

### TC-130: Фокус с клавиатуры
- Контур: демо
- Код: app/globals.css
- Шаги: перейти по элементам управления клавишей Tab; затем нажать на кнопку мышью.
- Ожидаемо: у элемента в фокусе с клавиатуры видно кольцо (одно на весь продукт, `--ds-focus-ring`, в тёмной теме светлее); после клика мышью кольца нет; у текстовых полей кольца нет — видны каретка и рамка поля.
- Автотест: e2e/functional/keyboardFocus.spec.ts
