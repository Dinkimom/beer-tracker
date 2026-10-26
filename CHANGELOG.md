# Changelog

Notable changes to Beer Tracker, newest first. English first, then Russian.

## [1.25.1] — 2026-10-26

### English

- Auto-placement and «place by person» no longer put cards on organization holidays.
- Sprint tasks follow the tracker's own order (Jira Rank / LexoRank); the Jira Rank field is found automatically.
- Transition dialog: user fields (assignee, QA, reporter and Yandex Tracker screen fields) are picked from the people list.
- Notes: Backspace at the start of a heading turns it into a paragraph; a checklist preview card can be dragged by its text.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.25.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Авторасстановка и расстановка «по человеку» не ставят карточки на праздники организации.
- Задачи спринта идут в порядке трекера (Jira Rank / LexoRank); поле Rank в Jira находится автоматически.
- Модалка перехода: поля-пользователи (исполнитель, QA, автор и поля экранов Яндекс Трекера) выбираются из списка людей.
- Заметки: Backspace в начале заголовка превращает его в абзац; карточку с чеклист-превью можно тянуть за текст.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.25.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.25.0] — 2026-10-26

### English

- **Security: the API now requires sign-in.** Planner, tracker and feature endpoints used to answer requests without a product session, and tracker calls fell back to the organization's stored token. Now they return 401, and the planner sends the user to sign in again (`/auth-setup` reissues the session from the tracker token). Public endpoints are only sign-in, MCP OAuth, cron with its secret and first-run setup.
- **Database migrations.** The schema now lives in numbered files `database/migrations/`, and applied files are recorded in `schema_migrations`. The app applies new migrations on start; `pnpm db:migrate` does the same by hand. The first migration brings a database created by any earlier `init.sql` up to date.
- **Action for operators:** the app's database role needs DDL rights (create and alter its tables). If production runs without them, set `DB_MIGRATIONS_AUTO=false` and run `pnpm db:migrate` as the table owner before starting each new version. If planner photos were still stored in the database (BYTEA), the first start removes them, as the app already did on first use. `database/init.sql` and the old `database/*.sql` files are gone; data-only scripts for old installations are in `database/legacy/`.
- «Done» is decided by the tracker: in Yandex Tracker a status of type «done» with a resolution, in Jira a status in the «done» category. Burndown, metrics, retro, score and the board use this one rule; the organization's «ready status» setting is no longer used.
- Agent plan changes apply all at once or not at all, and the same confirmation cannot be applied twice.
- If a task saved in the planner did not update in the tracker (assignee or dates), a toast now names the tasks instead of failing silently.
- Two people editing the same note no longer overwrite each other silently: the second save shows a conflict and loads the current note.
- Jira: if a transition fails, the fields written before it are reverted.
- Moving a feature row to another sprint no longer loses it when that sprint is open in another tab.
- Quick add near the end of a sprint no longer shortens the card; photos and diagrams are unavailable where they do not fit.
- The burndown ideal line skips organization holidays; sprint score matches the numbers shown.
- Moving a task to another sprint keeps the tracker's own issue links.
- Removed unused screens: Occupancy, quarterly planning, the epic editor, the Bugs (SLA) tab and GitLab merge request facts. Their database tables are kept for now.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.25.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- **Безопасность: API требует входа.** Эндпоинты планера, трекера и фич отвечали на запросы без сессии продукта, а вызовы трекера брали сохранённый токен организации. Теперь ответ 401, и планер отправляет пользователя войти заново (`/auth-setup` выдаёт сессию по токену трекера). Без входа доступны только вход, OAuth для MCP, cron по секрету и первичная настройка.
- **Миграции БД.** Схема теперь в нумерованных файлах `database/migrations/`, применённые записываются в `schema_migrations`. Приложение применяет новые миграции при старте, вручную — `pnpm db:migrate`. Первая миграция доводит до актуальной схемы БД, созданную любой прежней версией `init.sql`.
- **Действие для операторов:** роли приложения в БД нужны права на DDL (создавать и менять свои таблицы). Если в проде их нет, задайте `DB_MIGRATIONS_AUTO=false` и запускайте `pnpm db:migrate` под владельцем таблиц перед стартом каждой новой версии. Если фото планера ещё хранились в БД (BYTEA), первый старт удалит их — так раньше делало приложение при первом обращении. `database/init.sql` и старые `database/*.sql` удалены; разовые скрипты переноса данных для старых инсталляций — в `database/legacy/`.
- «Сделано» определяет трекер: в Яндекс Трекере — статус типа «завершено» с резолюцией, в Jira — статус категории «done». Burndown, метрики, ретро, скор и доска считают по одному правилу; настройка «статус готовности» организации больше не используется.
- Изменения плана от агента применяются целиком или никак, одно подтверждение нельзя применить дважды.
- Если сохранённая в планере задача не обновилась в трекере (исполнитель или даты), тост называет эти задачи, а не молчит.
- Две правки одной заметки больше не затирают друг друга молча: второе сохранение показывает конфликт и загружает актуальную заметку.
- Jira: если переход не прошёл, поля, записанные перед ним, возвращаются.
- Строка фичи, перенесённая в другой спринт, не теряется, если этот спринт открыт в другой вкладке.
- Quick add у конца спринта не укорачивает карточку; фото и схема недоступны там, где не помещаются.
- Идеальная линия burndown не опускается в праздники организации; скор спринта совпадает с показанными цифрами.
- Перенос задачи в другой спринт не трогает собственные связи трекера.
- Удалены неиспользуемые экраны: «Занятость», квартальное планирование, редактор эпиков, вкладка «Баги» (SLA) и факты MR из GitLab. Их таблицы в БД пока сохранены.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.25.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.24.0] — 2026-10-23

### English

- Manual swimlane layout: a new «Auto-arrange» toggle in the layers menu. Turn it off to place tasks and notes on any row by dragging; manual layers are saved per sprint and shared with the team.
- Notes get a WYSIWYG editor: headings, bullet lists, checkboxes and mentions are edited in place, while the note is still stored as plain markdown that the agent and checkboxes on the board keep reading.
- A note can be expanded into a focused editor and sent back to the board.
- Saving a note now plays a short «stick to the board» animation instead of a toast.
- Hovering the board is calmer: linked-task highlighting and the «+» in empty cells appear only after the cursor rests for a moment.
- No operator action needed: the new `swimlane_card_layers` table is created automatically on first use. Migration file `database/add-swimlane-card-layers.sql` is available for manual setups.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.24.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Ручная раскладка свимлейна: в меню слоёв появился переключатель «Автосортировка». Выключите его — и задачи с заметками можно расставлять по строкам перетаскиванием; ручные слои сохраняются в спринте и видны всей команде.
- WYSIWYG-редактор заметок: заголовки, списки, чекбоксы и упоминания правятся прямо в тексте, а заметка по-прежнему хранится как markdown, который читают агент и чекбоксы на доске.
- Заметку можно развернуть в отдельный редактор и вернуть на доску.
- Сохранение заметки сопровождается короткой анимацией «приклеивания» вместо тоста.
- Доска спокойнее реагирует на курсор: подсветка связанных задач и «+» в пустых ячейках появляются, только когда курсор задержался.
- Действий от операторов не нужно: новая таблица `swimlane_card_layers` создаётся автоматически при первом обращении. Для ручной установки есть миграция `database/add-swimlane-card-layers.sql`.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.24.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.23.1] — 2026-10-23

### English

- The agent can now edit and delete notes in its draft. The proposed version sits semi-transparent next to the original: Accept applies the edit (or removes the note), Reject drops the proposal.
- Agent proposal cards on the swimlane can be dragged and resized. This moves the proposal itself, not the task's position on the board.
- Focusing a note from the draft highlights it on the board.
- Resizing a card gives it a springy squash and stretch while you drag, with a little bounce on release.
- Agent chat: context chips (task, note) can be removed with ×. Tasks you mention in follow-up messages are now included in the agent's context for an ongoing session.
- Bullet lists (`-`, `*`, `+`) in notes render as markdown.
- No operator action needed: new `comments` and `agent_sessions` columns are added automatically on start. Migration files `database/add-comment-replacements.sql` and `database/add-agent-session-activity.sql` are available for manual setups.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.23.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Агент может править и удалять заметки в драфте. Предложенная версия висит полупрозрачно рядом с оригиналом: «Принять» переносит правку (или удаляет заметку), «Отклонить» убирает предложение.
- Карточки-предложения агента на свимлейне можно перетаскивать и ресайзить — двигается само предложение, а не позиция задачи на доске.
- Фокус на заметке из драфта подсвечивает её на доске.
- При ресайзе карточка упруго сжимается и растягивается за рукой и слегка пружинит после отпускания.
- Чат с агентом: плашки контекста (задача, заметка) снимаются крестиком. Задачи, упомянутые в новых репликах, попадают в контекст агента и в уже идущей сессии.
- Маркированные списки (`-`, `*`, `+`) в заметках отображаются как markdown.
- Действий от операторов не нужно: новые колонки `comments` и `agent_sessions` добавляются автоматически при старте. Для ручной установки есть миграции `database/add-comment-replacements.sql` и `database/add-agent-session-activity.sql`.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.23.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.23.0] — 2026-10-23

### English

- The MCP sprint context now includes `unplannedTasks`: tracker issues in the sprint that are not yet on the board, so the agent sees the sprint backlog and can place it. The usual `featureId`, `assigneeId` and `taskIds` filters apply.
- Jira: sprint issues are no longer lost when issue types have localized names («Баг», «Задача»); only epics are left out. This fixes sprint membership, plan-vs-actual and false `issue_not_in_sprint` warnings for the agent.
- Agent chat: new replies type out word by word; answer buttons appear when the text is done.
- You can see what an external agent (claude.ai, Cursor…) is doing: the chat shows its current step from its MCP calls instead of «Waiting for the agent». If it goes quiet for more than 3 minutes, the chat suggests nudging it.
- When the agent replies while the chat is collapsed, a «Claude replied» toast opens the chat and the ✨ dot pulses. In a background tab the toast waits until you come back.
- Accepting a draft no longer closes the agent session, so you can keep the conversation going.
- No operator action needed: new `agent_sessions` columns are added automatically on start.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.23.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Контекст спринта в MCP отдаёт `unplannedTasks` — задачи спринта в трекере, которых ещё нет на доске: агент видит бэклог спринта и может его разложить. Работают обычные фильтры `featureId`, `assigneeId` и `taskIds`.
- Jira: задачи спринта больше не теряются, если типы задач названы по-русски («Баг», «Задача»); отсекаются только эпики. Это чинит принадлежность к спринту, план против факта и ложные предупреждения `issue_not_in_sprint` у агента.
- Чат с агентом: новые ответы «допечатываются» по словам, кнопки вариантов появляются после текста.
- Видно, что делает внешний агент (claude.ai, Cursor…): вместо «Ждёт агента» чат показывает его текущий шаг по вызовам MCP. Если агент затих больше чем на 3 минуты, чат подскажет напомнить ему.
- Ответ агента при свёрнутом чате: тост «Claude ответил» открывает чат, точка на ✨ пульсирует. В фоновой вкладке тост дождётся возвращения.
- После «Принять всё» сессия с агентом не закрывается — разговор можно продолжить.
- Действий от операторов не нужно: новые колонки `agent_sessions` добавляются автоматически при старте.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.23.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.22.1] — 2026-10-22

### English

- Status changes respond right away: the card shows a pending state, then recolors with a highlight on success, or shakes and rolls back with an error toast on failure.
- Cards leaving the board (moved to another sprint, to the backlog or off the plan) now animate out instead of disappearing.
- Swimlane segment editor: click the card to split it, drag a break to move it or change its length; a hint explains the controls.
- Task resize handles give a small nudge as the edge snaps to the next grid cell.
- Each person on the board gets their own presence color, used for avatars and for outlining cards they are dragging.
- Copy actions in the context menu confirm with «Copied» on the button itself.
- The active sprint's tasks refresh quietly every minute, so status changes made outside the planner show up without reloading; your unsaved edits are never overwritten.
- Jira: the field catalog, board filter and sprint board are cached, and moving a task to a sprint or changing its status sends requests in parallel, so these actions are noticeably faster.
- Demo planner: status workflow and moving tasks between sprints work on fixtures.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.22.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Смена статуса откликается сразу: карточка показывает «в процессе», затем перекрашивается с подсветкой или, при ошибке, встряхивается, откатывается и показывает тост.
- Карточка, уходящая с доски (в другой спринт, в бэклог или с плана), исчезает с анимацией, а не мгновенно.
- Редактор сегментов свимлейна: клик по карточке разрезает её, разрыв можно перетаскивать и менять его длину; в шапке есть подсказка.
- Рукоятки ресайза задач слегка «щёлкают» при переходе кромки на следующую ячейку сетки.
- У каждого участника доски свой цвет присутствия — на аватарах и в обводке карточки, которую он тянет.
- Копирование из контекстного меню подтверждается надписью «Готово» прямо на кнопке.
- Задачи активного спринта тихо обновляются раз в минуту — смена статуса вне планера видна без перезагрузки; несохранённые правки не затираются.
- Jira: каталог полей, фильтр доски и доска спринта кэшируются, а перенос в спринт и смена статуса шлют запросы параллельно — эти действия заметно быстрее.
- Демо-планер: workflow статусов и перенос задач между спринтами работают на фикстурах.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.22.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.22.0] — 2026-10-22

### English

- Agent skills in the planner chat: type «/» to pick a ready-made scenario (balance load, place tasks, sprint goals, sprint risks) and set its options; the agent gets the instructions with the session.
- The agent can ask a question with 2–5 answer buttons; your pick is sent as the next message.
- Agent replies render as Markdown (tables, lists, checklists); task keys and links stay clickable.
- The agent sees who created each sticky note and retro card and who reacted with which emoji (✅ = marked done).
- Jira: a task's sprint is read from the site's Sprint custom field, so sprints show up for issues loaded through REST v3.
- Planner links and comments no longer load twice when a sprint opens, and switching sprints quickly no longer shows another sprint's list.
- New columns in `agent_session_messages` are added automatically on first use; no manual migration needed.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.22.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Скиллы агента в чате планера: «/» открывает готовые сценарии (выровнять загрузку, расставить задачи, цели спринта, риски спринта) с параметрами; агент получает инструкцию вместе с сессией.
- Агент может задать вопрос с 2–5 кнопками-вариантами; выбор уходит следующей репликой.
- Ответы агента отображаются как Markdown (таблицы, списки, чекбоксы); ключи задач и ссылки кликабельны.
- Агент видит автора заметок и карточек ретро и кто какой emoji поставил (✅ — отмечено сделанным).
- Jira: спринт задачи берётся из Sprint custom field сайта — спринты видны и у задач, загруженных через REST v3.
- Связи и комментарии планера больше не грузятся дважды при открытии спринта, а при быстром переключении спринтов не подменяются списком другого спринта.
- Новые колонки в `agent_session_messages` добавляются автоматически при первом обращении, ручная миграция не нужна.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.22.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.21.1] — 2026-10-22

### English

- Swimlane fact timeline: tester-owned tasks in QA projects (AQA, MQA and similar) now show all work phases on the QA lane instead of only the close marker, including tasks estimated in story points. QA copies of developer tasks still show only the testing phases.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.21.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Таймлайн факта на свимлейне: собственные задачи тестировщика в QA-проектах (AQA, MQA и т.п.) на дорожке QA показывают все рабочие фазы, а не только маркер закрытия, в том числе задачи с оценкой в SP. QA-копии задач разработчиков по-прежнему показывают только фазы тестирования.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.21.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.21.0] — 2026-10-22

### English

- Plan a task in another sprint: «Plan…» in the task menu opens the target sprint and puts the card on the first day of the lane as a draft. Drag it into place, then confirm or cancel in the move toolbar; the planner returns to the original sprint. Sticky notes can move to another sprint the same way.
- Context menus, submenus, selects and the sprint list share one glass style; the selected item shows a check mark.
- Assignee picker groups people by platform, marks suitable assignees and shows load as «N of M».
- Toasts match the glass menus, and all toast texts are translated.
- Sticky notes render inline **bold**, *italic*, ~~strike~~ and `code` on the swimlane and in retro cards.
- A «+Nd» badge marks cost that grew after work started.
- Tic-tac-toe strikes through the winning line and shows a result banner.
- Submenus and context menus stay on screen near the viewport edges.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.21.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Запланировать задачу в другом спринте: «Запланировать…» в меню задачи открывает целевой спринт и ставит карточку черновиком в первый день дорожки. Перетащите её на место и подтвердите или отмените в панели переноса — планер вернётся в исходный спринт. Заметки переносятся в другой спринт так же.
- Контекстные меню, сабменю, селекты и список спринтов — в едином стеклянном стиле, выбранный пункт отмечен галочкой.
- Выбор исполнителя группирует людей по платформе, отмечает подходящих и показывает загрузку «N из M».
- Тосты оформлены как стеклянные меню, все тексты тостов переведены.
- Заметки поддерживают инлайн **жирный**, *курсив*, ~~зачёркнутый~~ и `код` на свимлейне и в карточках ретро.
- Значок «+Nд» отмечает стоимость, выросшую после старта работы.
- Крестики-нолики зачёркивают выигрышную линию и показывают плашку итога.
- Сабменю и контекстные меню не уходят за край экрана.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.21.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.20.0] — 2026-10-21

### English

- Swimlane: cards compare the plan with the plan when work started. Cost added after the start is hatched, and a corner badge marks a task moved earlier or later. Hover a moved task to see its original plan while the other cards dim.
- Task cards: corner badges for planning errors, plan moves and hidden links (the «+N» link badge moved onto the card).
- Dropping a card snaps its left edge to the nearest grid line, so where you grab the card no longer shifts the drop.
- Agent: the ✨ button in the swimlane toolbar opens the session chat, or a new request about the sprint when there is no session. «New session» and «Clear chat» are in the chat header; the separate «Chat» button is gone.
- Agent plan previews can sync to the tracker: approving one adds the issue to the tracker sprint, assigns it and updates other open tabs. **Action required for an existing DB:** run `database/add-plan-patch-previews.sql` (adds `plan_patch_position_previews.sync_to_tracker`).
- Quick add searches the whole tracker, not only the board (Jira). Epic search stays within the board. Searching by an issue key prefix no longer fails when that key does not exist.
- Agent bridge log shows total tokens and cost for each run.
- Availability chips sit at the bottom of the card area, above the fact and calendar tracks.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.20.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Свимлейн: карточки сравнивают план с планом на старте работы. Стоимость, добавленная после старта, заштрихована, угловой значок показывает перенос раньше или позже. При наведении на перенесённую задачу виден исходный план, остальные карточки приглушаются.
- Карточки задач: угловые значки ошибки планирования, переноса плана и скрытых связей (счётчик «+N» переехал на карточку).
- При дропе левый край карточки снапается к ближайшей линии сетки: место захвата больше не сдвигает позицию.
- Агент: кнопка ✨ в тулбаре свимлейна открывает чат сессии, а без сессии — новую просьбу про спринт. «Новая сессия» и «Очистить чат» — в шапке чата, отдельной кнопки «Чат» больше нет.
- Превью плана от агента может синхронизироваться с трекером: при подтверждении задача добавляется в спринт трекера, назначается исполнитель, другие открытые вкладки обновляются. **Нужно действие для существующей БД:** выполните `database/add-plan-patch-previews.sql` (колонка `plan_patch_position_previews.sync_to_tracker`).
- Быстрое добавление ищет задачи по всему трекеру, а не только на доске (Jira). Поиск эпика — по-прежнему в рамках доски. Поиск по префиксу ключа больше не падает, если такой задачи нет.
- Лог моста агента показывает итоговые токены и стоимость прогона.
- Чипы занятости стоят внизу зоны карточек, над дорожками факта и календаря.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.20.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.19.1] — 2026-10-21

### English

- Sprint context for agents: notes carry `width` (timeline parts), `height` (swimlane rows) and `color`. `propose_plan_patch` warns `note_overlap` when one assignee's notes overlap in time and names the first free slot.
- Docker Hub images are now built in GitHub Actions on native amd64 and arm64 runners when a release tag is pushed (workflow `docker-hub.yml`, no QEMU emulation). Re-publish an existing version via Run workflow.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.19.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Контекст спринта для агентов: у заметок есть `width` (части таймлайна), `height` (строки свимлейна) и `color`. `propose_plan_patch` предупреждает `note_overlap`, если заметки одного исполнителя пересекаются по времени, и называет первый свободный слот.
- Образы Docker Hub теперь собираются в GitHub Actions на нативных раннерах amd64 и arm64 при пуше тега релиза (workflow `docker-hub.yml`, без эмуляции QEMU). Перевыпустить существующую версию — через Run workflow.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.19.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.19.0] — 2026-10-21

### English

- Yandex Tracker sign-in via Yandex ID OAuth: «Sign in with Yandex ID» on `/auth-setup`, `/register` and the tracker tab in settings replaces pasting a token. The code is exchanged on the server (`/api/auth/yandex/start` → `/api/auth/yandex/callback`), the client secret never reaches the browser.
- **Action required for Yandex Tracker instances:** set the new runtime env `YANDEX_OAUTH_CLIENT_SECRET` and use a Yandex ID app of type «user authorization» with Redirect URIs `{origin}/api/auth/yandex/callback` and `https://oauth.yandex.ru/verification_code`. Apps of type «API access» cannot change their Redirect URI — create a new one. See `docs/ISSUE_TRACKERS.md` → «Ветка A».
- Admin → «Tracker»: the organization token for sync is still pasted manually; the «get token» link shows it on the Yandex page.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.19.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Вход в Яндекс Трекер через OAuth Яндекс ID: кнопка «Войти с Яндекс ID» на `/auth-setup`, `/register` и во вкладке трекера в настройках вместо ручной вставки токена. Код обменивается на сервере (`/api/auth/yandex/start` → `/api/auth/yandex/callback`), секрет приложения в браузер не попадает.
- **Нужно действие для инстансов с Яндекс Трекером:** задайте новую runtime env `YANDEX_OAUTH_CLIENT_SECRET` и используйте приложение Яндекс ID типа «для авторизации пользователей» с Redirect URI `{origin}/api/auth/yandex/callback` и `https://oauth.yandex.ru/verification_code`. У приложений типа «для доступа к API» Redirect URI не меняется — создайте новое. Подробности — `docs/ISSUE_TRACKERS.md` → «Ветка A».
- Админка «Трекер»: токен организации для синхронизации по-прежнему вставляется вручную, ссылка «получить токен» показывает его на странице Яндекса.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.19.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.18.1] — 2026-10-21

### English

- Swimlane links: new setting «Links visible without hover» — all, important only (blockers and links drawn in the planner) or on hover only. Blockers that break the schedule always stay visible; hidden links show as a «+N» badge on the card.
- Agent sessions: while the Claude CLI bridge works, the «Waiting for agent» bubble shows the current step and elapsed time. Agent replies are signed with the MCP client (Claude, Cursor…); for an existing DB run `database/add-agent-sessions.sql`. «End session» is now «Clear chat».
- Agent bridge: CLI model is set by `AGENT_BRIDGE_MODEL` (default `sonnet`).
- Task card opens for issues outside synced sprints: the API falls back to the live tracker issue when there is no snapshot.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.18.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Связи свимлейна: новая настройка «Какие связи видны без наведения» — все, только важные (блокировки и связи, нарисованные в планере) или только при наведении. Блокировки, нарушающие план, видны всегда; скрытые связи — бейдж «+N» на карточке.
- Сессии с агентом: пока мост Claude CLI работает, пузырь «Ждёт агента» показывает текущий шаг и сколько прошло времени. Ответы агента подписаны клиентом MCP (Claude, Cursor…); для существующей БД — `database/add-agent-sessions.sql`. «Завершить сессию» стала «Очистить чат».
- Мост агента: модель CLI задаётся `AGENT_BRIDGE_MODEL` (по умолчанию `sonnet`).
- Карточка задачи открывается и для задач вне синкнутых спринтов: без снапшота API берёт живую задачу из трекера.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.18.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.18.0] — 2026-10-20

### English

- New **Metrics** sprint tab: board dashboard by quarter with say/do, velocity, cycle time, carry-over and bug share, charts, a per-sprint table, team and period filters and CSV export. Facts for finished sprints are frozen in `sprint_metrics`; for an existing DB run `database/add-sprint-metrics.sql`. Also on `/demo/planner`.
- Agent sessions: send the agent a request from the task card menu, the note menu or ✨ in the bottom toolbar. The chat supports `@` mentions of tasks and people, 💬 comments on draft items, «Ask to redo» and a session feed. New MCP tools `list_agent_sessions`, `get_agent_session`, `reply_agent_session`; `propose_plan_patch` accepts `sessionId`, `replies`, `draftMessage`, `intent`.
- Plan drafts are private: card and goal previews, draft notes and the pending proposal are visible only to their owner, one pending draft per user per sprint. For an existing DB run `database/add-agent-sessions.sql`.
- Optional local agent bridge (`pnpm agent-bridge`, settings in `.env.agent-bridge.local`) starts the CLI agent when a session is waiting for it; it may read and propose, never apply.
- Jira: moving an issue into a sprint also sets the simple `field = value` conditions from the board JQL filter (e.g. Team), so the issue shows up on the board.
- Softer sticky note palette in light and dark themes; note reactions are no longer covered by cards in the next row.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.18.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Новая вкладка спринтов **«Метрики»**: дашборд доски по кварталам — say/do, velocity, cycle time, перенос и доля багов, графики, таблица по спринтам, фильтры команды и периода, выгрузка CSV. Факты закончившихся спринтов замораживаются в `sprint_metrics`; для существующей БД — `database/add-sprint-metrics.sql`. Есть и на `/demo/planner`.
- Сессии с агентом: просьба агенту из меню карточки задачи, меню заметки или кнопкой ✨ в нижнем тулбаре. В чате — `@`-упоминания задач и людей, 💬 к пунктам драфта, «Попросить переделать» и лента сессии. Новые MCP-тулы `list_agent_sessions`, `get_agent_session`, `reply_agent_session`; `propose_plan_patch` принимает `sessionId`, `replies`, `draftMessage`, `intent`.
- Драфты плана приватны: превью карточек и целей, черновые заметки и неподтверждённый драфт видит только владелец, один драфт на пользователя в спринте. Для существующей БД — `database/add-agent-sessions.sql`.
- Опциональный локальный мост агента (`pnpm agent-bridge`, настройки в `.env.agent-bridge.local`) запускает CLI-агента, когда сессия ждёт агента; только чтение и propose, без apply.
- Jira: при переносе задачи в спринт проставляются простые условия `поле = значение` из JQL-фильтра доски (например, Team), чтобы задача была видна на доске.
- Палитра заметок мягче в светлой и тёмной теме; реакции заметки больше не перекрываются карточками следующей строки.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.18.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.17.5] — 2026-10-20

### English

- Swimlane drag and quick-add keep the card inside the sprint timeline (no drop past the last cell or into the after-sprint rail).
- Issue keys in sticky note text (e.g. `PROJ-12`) render as links.
- A ✅ quick reaction paints the sticky note green; color changes play a short pop (respects reduced motion).
- Issue links batch requests are split into chunks within the API limit, so large boards load all links.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.17.5` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Drag и quick-add в свимлейне держат карточку внутри таймлайна спринта (без выезда за последнюю ячейку и в зону после спринта).
- Ключи задач в тексте заметки (например, `PROJ-12`) становятся ссылками.
- Быстрая реакция ✅ красит заметку в зелёный; смена цвета — с коротким подскоком (с учётом reduced motion).
- Batch-запрос связей задач режется на чанки в пределах лимита API, на больших досках подгружаются все связи.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.17.5` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.17.4] — 2026-10-19

### English

- `YANDEX_OAUTH_CLIENT_ID` is runtime env on the app container (not a Docker build ARG); the «get token» link goes through `/api/auth/yandex/authorize` so the ClientID is not inlined into the client bundle.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.17.4` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- `YANDEX_OAUTH_CLIENT_ID` — runtime env контейнера app (не Docker build ARG); ссылка «получить токен» идёт через `/api/auth/yandex/authorize`, ClientID больше не вшивается в клиентский бандл.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.17.4` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.17.3] — 2026-10-19

### English

- Org Settings picks a holiday calendar country; planner columns and capacity treat those weekdays as unavailable, and sprint context exposes `holidayCountry` / `holidayDays`.
- A second `propose_plan_patch` does not silently replace an unconfirmed proposal — pass `replacePending=true` (or apply/reject first). `get_sprint_context` includes `pendingProposal` when one is on the board.
- Propose returns clearer `positionChanges` and `contentChanges` (was→became) for moves, splits, notes, and goals.
- Admin team membership can pick people from the tracker roster; members keep role and platform fields.
- Short task cards can keep a slot visible when its row would otherwise hide; segment edit respects gaps between parts.
- Draft plan-patch notes store an MCP client brand mark.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.17.3` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- В настройках организации выбирается страна календаря праздников; колонки планера и capacity считают эти будни недоступными, а контекст спринта отдаёт `holidayCountry` / `holidayDays`.
- Второй `propose_plan_patch` не подменяет неподтверждённое предложение молча — нужен `replacePending=true` (или сначала apply/reject). В `get_sprint_context` появляется `pendingProposal`, если превью уже на доске.
- Propose возвращает понятнее `positionChanges` и `contentChanges` (было→стало) для сдвигов, разрезов, заметок и целей.
- В админке состав команды можно набирать из ростера трекера; у участников остаются роль и платформы.
- На коротких карточках слот можно оставить видимым, даже если ряд скрыт правилами плотности; правка сегментов учитывает зазоры между частями.
- Черновые заметки патча плана хранят марку MCP-клиента.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.17.3` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.17.2] — 2026-10-19

### English

- A plan-patch preview draws each split segment of a task and the arrows between them. Accept writes the move; reject drops that preview.
- Propose can place an already-split task and add it to the tracker sprint with `syncToTracker`, and returns a hint when the issue is not on the sprint yet.
- Sprint context includes the board team roster with role, title, and platforms. MCP adds `whoami` and `resolve_person`.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.17.2` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Превью патча плана рисует каждый сегмент разрезанной задачи и стрелки между ними. Принятие записывает сдвиг, отказ убирает это превью.
- Propose может поставить уже разрезанную задачу и добавить её в спринт трекера через `syncToTracker`, и возвращает подсказку, если задачи ещё нет в спринте.
- Контекст спринта включает состав команды доски с ролью, должностью и платформами. В MCP появились `whoami` и `resolve_person`.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.17.2` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.17.1] — 2026-10-19

### English

- Planner pattern offset accepts a real DOM `offsetParent`, so the production build typechecks.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.17.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Сдвиг узора планера принимает настоящий DOM `offsetParent`, и продакшен-сборка проходит проверку типов.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.17.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.17.0] — 2026-10-19

### English

- An agent plan patch shows proposed task moves on the swimlane and proposed goal text in the sidebar. Accept writes the change; reject drops that preview.
- Sticky notes pick a color from swatches, sit at a slight tilt, and fade out on delete.
- Retro cards show the note author and a compact comment thread.
- Weekend columns share one hatch that stays aligned while the planner scrolls.
- Sprint start no longer uses the old checklist panel; the remaining start checks stay with the goals tab.
- MCP OAuth consent shows the connecting client's brand mark.
- README landing is in English as well, with companies named before install.
- Docker Hub images were not published for this tag; the production build failed typecheck. Images ship as `1.17.1`.

### Русский

- Патч плана от агента показывает сдвиг задач на свимлейне и новый текст целей в сайдбаре. Принятие записывает правку, отказ убирает это превью.
- Стикеры выбирают цвет свотчами, слегка наклонены и гаснут при удалении.
- Карточки ретро показывают автора заметки и компактную ленту комментариев.
- Колонки выходных делят одну штриховку, которая не съезжает при прокрутке планера.
- Старт спринта больше не открывает старую панель чеклиста; оставшиеся проверки старта живут на вкладке целей.
- Согласие MCP OAuth показывает марку клиента, который подключается.
- Посадочная README есть и на английском, компании названы до установки.
- Образы Docker Hub для этого тега не публиковались: продакшен-сборка не прошла проверку типов. Образы вышли как `1.17.1`.

## [1.16.8] — 2026-10-17

### English

- README landing opens on the planner and walks the screens (backlog, burndown, fact, retro, collaboration) before install and MCP.
- Planner copy matches the grid: sprint length follows tracker dates, 2–4 timeslots per day (default three), leave and tech sprints on the lanes, notes with links, checklists, and reactions.
- The header mark is the two-mug Lottie from the app. Planner shots are in English and include the task sidebar.
- Docker Hub images were not republished; compose stays on tag `1.16.7`.

### Русский

- Посадочная README открывается планером и идёт по экранам (бэклог, burndown, факт, ретро, совместная работа) до установки и MCP.
- Текст планера совпадает с сеткой: длина спринта из дат трекера, 2–4 таймслота в дне (по умолчанию три), отпуска и техспринты на дорожках, заметки со ссылками, чеклистами и реакциями.
- Знак в шапке — лотти с двумя кружками из приложения. Кадры планера на английском и с открытым списком задач.
- Образы Docker Hub не публиковались заново; compose остаётся на теге `1.16.7`.

## [1.16.7] — 2026-10-17

### English

- README planner screenshots are retaken in light and dark. Fact timeline and collaboration images are real board captures, not broken placeholders.
- The demo planner serves fixture changelogs and two presence viewers, so the fact bars and collaboration avatars render on `/demo/planner`.
- Open-ended fact durations follow the planner clock, so the demo “today” does not stretch to the wall clock.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.7` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Скрины планера в README пересняты в светлой и тёмной теме. Таймлайн факта и совместная работа — кадры доски, а не битые плейсхолдеры.
- Демо-планер отдаёт фикстурный changelog и двух зрителей presence, поэтому полосы факта и аватары видны на `/demo/planner`.
- Незакрытые фазы факта считаются по часам планера, и демо-«сегодня» не тянется до настенных часов.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.7` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.16.6] — 2026-10-17

### English

- Public fixture demo at `/demo/planner` (no tracker login): swimlanes, backlog, burndown, and retro, with a frozen planner clock.
- README is a product landing page with screenshots; install steps live in `docs/INSTALL.md`.
- Swimlane weekend and holiday columns share one hatch (sleep, coffee, home) when the day is not covered by an absence.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.6` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Публичное демо на фикстурах `/demo/planner` (без логина в трекер): свимлейны, бэклог, burndown и ретро, часы планера зафиксированы.
- README — посадочная страница со скринами; установка вынесена в `docs/INSTALL.md`.
- Выходные и праздники на свимлейне рисуются одной штриховкой (сон, кофе, дом), если день не перекрыт отсутствием.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.6` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.16.5] — 2026-10-17

### English

- Retro board reactions: per-user votes with counts (legacy string emojis migrate on parse); merge keeps concurrent votes; MCP view returns unique emojis.
- Swimlane in-progress fact timeline hides days with availability events (leave, on-call, sick leave, etc.), not only weekends.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.5` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Реакции на доске ретро: голоса по пользователям со счётчиками (legacy-строки emoji мигрируют при parse); merge сохраняет одновременные голоса; MCP-view отдаёт уникальные emoji.
- Таймлайн факта In Progress на свимлейне скрывает дни с событиями занятости (отпуск, дежурство, больничный и т.п.), не только выходные.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.5` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.16.4] — 2026-10-16

### English

- MCP `whoami`, `get_issue` (description/links/comments), and `get_issue_snapshot` (synced `issue_snapshots` dump).
- Planning `statusCategory` on positions and `search_issues` (e.g. Ready for development → not-started); prefer over raw Jira `statusType`.
- MCP retro board: `get_retro_board` / `apply_retro_board` (notes, comments, columns).
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.4` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- MCP `whoami`, `get_issue` (описание/связи/комментарии) и `get_issue_snapshot` (снимок из выгрузки `issue_snapshots`).
- Планировочный `statusCategory` на позициях и в `search_issues` (Ready for development → not-started); предпочтительнее сырого Jira `statusType`.
- MCP-доска ретро: `get_retro_board` / `apply_retro_board` (заметки, комментарии, колонки).
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.4` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.16.3] — 2026-10-16

### English

- MCP positions expose tracker `status` / `statusDisplay` / `statusType` / `priority` / `createdAt` and `sprintHistory` for carry-over planning.
- New MCP tool `search_issues` searches board/backlog issues with filters and compact fields for estimation.
- Sticky notes: soft-delete + `updatedAt` / `updatedBy` / `version`; `updateNote.ifVersion`; propose preflight for missing notes/goals; `persistNotes?: false`; apply `onError: stop|continue`.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.3` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- MCP-позиции отдают статус трекера (`status` / `statusDisplay` / `statusType` / `priority` / `createdAt`) и `sprintHistory` для планирования переносов.
- Новый MCP-инструмент `search_issues` — поиск задач на доске/бэклоге с фильтрами и компактными полями для оценки.
- Sticky notes: soft-delete + `updatedAt` / `updatedBy` / `version`; `updateNote.ifVersion`; preflight в propose; `persistNotes?: false`; apply `onError: stop|continue`.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.3` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.16.2] — 2026-10-16

### English

- MCP sprint context uses the org planner grid (`meta.partsPerDay`); capacity, legends, and plan-patch reject parts outside that grid.
- `propose_plan_patch` / `apply_plan_patch` return a calendar `schedule`; propose warns `issue_not_in_sprint`; `upsertPosition.syncToTracker` can add the issue to the tracker sprint and assign.
- `get_sprint_context` accepts `assigneeId` / `taskIds` filters; positions include `planVsActual` (plan vs actual parts, best-effort `carriedOver`).
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.2` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- MCP sprint context берёт сетку дня из настроек орги (`meta.partsPerDay`); capacity, легенда и plan patch отклоняют слоты вне сетки.
- `propose_plan_patch` / `apply_plan_patch` отдают календарный `schedule`; propose предупреждает `issue_not_in_sprint`; `upsertPosition.syncToTracker` может добавить задачу в спринт трекера и назначить исполнителя.
- `get_sprint_context` фильтрует по `assigneeId` / `taskIds`; у позиций есть `planVsActual` (план против факта, best-effort `carriedOver`).
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.2` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.16.1] — 2026-10-16

### English

- MCP OAuth no longer elevates removed users to org admin: a live token without org membership is rejected (401), and deleting a user revokes their MCP tokens.
- Plan-patch tools receive the signed-in user and role; writes require planner access (`canUsePlanner`), and draft notes use that user as author.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- MCP OAuth больше не повышает удалённых пользователей до org admin: живой токен без членства в org отклоняется (401), при удалении пользователя его MCP-токены отзываются.
- Инструменты plan patch получают пользователя и роль; запись требует доступ к планеру (`canUsePlanner`), черновики заметок пишутся от этого пользователя.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.16.0] — 2026-10-16

### English

- **Breaking:** Remote MCP (`/api/mcp`) and agent sprint-context auth use **OAuth 2.1** (PKCE, DCR, consent UI). `SPRINT_CONTEXT_MCP_SECRET` and `X-Sprint-Context-Secret` are removed — connect with URL only; Cursor/Claude complete browser login.
- Consent screen shows agent ↔ Beer Tracker branding; POST consent redirects with HTTP 303 so desktop callbacks receive GET.
- Plan-patch `applyToken` HMAC uses `AUTH_SESSION_SECRET`.
- Sprint planner presence reports idle/active attention (tab hidden or no pointer/keyboard for 90s).
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.16.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- **Breaking:** Remote MCP (`/api/mcp`) и агентский sprint-context — **OAuth 2.1** (PKCE, DCR, consent UI). `SPRINT_CONTEXT_MCP_SECRET` и `X-Sprint-Context-Secret` убраны — в конфиге достаточно URL; логин в браузере.
- Экран согласия с брендами агента и Beer Tracker; после POST consent редирект **303**, чтобы desktop-callback получал GET.
- HMAC `applyToken` для plan patch — через `AUTH_SESSION_SECRET`.
- Presence в планере: idle/active (скрытая вкладка или нет pointer/keyboard 90 с).
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.16.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.15.1] — 2026-10-15

### English

- Inline full-rescan no longer sticks forever on a `running` sync_runs row after Cloud Run timeout or a mid-sync deploy: runs older than 40 minutes are marked failed so the next Scheduler call can proceed.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.15.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Inline full-rescan больше не блокируется навечно записью `running` в sync_runs после таймаута Cloud Run или деплоя посреди прогона: прогоны старше 40 минут помечаются failed, и следующий вызов Scheduler снова проходит.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.15.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.15.0] — 2026-10-15

### English

- Cloud Scheduler can run a full tracker rescan via `POST /api/internal/sync/full-rescan` (shared `SYNC_CRON_SECRET`) inline in the HTTP request — no Redis or sync-worker required.
- Standalone QA tasks (`hideTestPointsByIntegration`) count story points like other work; header and velocity readout prefer SP instead of TP in that mode.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.15.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Google Cloud Scheduler может запустить полный rescan трекера через `POST /api/internal/sync/full-rescan` (общий `SYNC_CRON_SECRET`) прямо в HTTP-запросе — без Redis и sync-worker.
- Отдельные QA-задачи (`hideTestPointsByIntegration`) учитывают story points как обычная работа; в шапке и velocity в этом режиме приоритет у SP, а не TP.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.15.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.14.2] — 2026-10-15

### English

- Swimlane drag-and-drop picks the row under the pointer by Y instead of `closestCenter`, so tasks no longer jump between full-width rows or fight the unassigned sidebar at the right edge.
- Sidebar drop targeting uses a dedicated pointer store; drop preview and position math stay in sync while dragging onto unassigned.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.14.2` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- DnD на свимлейне выбирает полосу под курсором по Y вместо `closestCenter`, поэтому задачи больше не скачут между full-width рядами и не конкурируют с сайдбаром «не назначено» у правого края.
- Цель сброса в сайдбар идёт через отдельный store указателя; превью слота и расчёт позиции остаются согласованными при перетаскивании в неназначенные.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.14.2` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.14.1] — 2026-10-15

### English

- Docker image build includes `CHANGELOG.md` again so What’s new can be embedded at build time.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.14.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- В Docker-сборку снова попадает `CHANGELOG.md`, чтобы «Что нового» встраивалось на этапе build.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.14.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.14.0] — 2026-10-15

### English

- Settings opens What’s new from the version label: recent releases from `CHANGELOG.md`, without the Docker Hub publish lines.
- The swimlane cards tool lets you pick which card types appear when placing sticky notes and widgets.
- The participants feature column remembers its width; a new default applies when nothing is stored yet.
- Admin tracker catalog and metadata responses share a fresher cache so integration setup reloads fields without stale boards.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.14.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- В настройках по подписи версии открывается «Что нового»: последние релизы из `CHANGELOG.md`, без строк про публикацию образов Docker Hub.
- В инструменте карточек свимлейна можно выбрать, какие типы карточек показывать при размещении стикеров и виджетов.
- Ширина колонки фич у участников запоминается; если значения ещё нет, применяется новый default.
- Ответы каталога и метаданных трекера в админке делят более свежий кэш, чтобы настройка интеграции подтягивала поля без устаревших досок.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.14.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.13.1] — 2026-10-14

### English

- Opening a sprint board no longer asks Jira for issue links one task at a time. Links are taken from the sprint search that already loaded the board, and a cold batch is a single `key in (...)` search.
- Sprint issue search, sprint info, score, and assignee velocity share an in-memory cache on the instance, so a second open does not repeat the same Jira calls.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.13.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Открытие доски спринта больше не ходит в Jira за связями по одной задаче. Связи берутся из поиска спринта, которым уже загружена доска, а холодный batch — один поиск `key in (...)`.
- Поиск задач спринта, сведения о спринте, score и velocity делят кэш в памяти инстанса, поэтому повторное открытие не повторяет те же запросы в Jira.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.13.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.13.0] — 2026-10-14

### English

- Swimlane cards include a tic-tac-toe widget, placed from the cards tool. A finished game bursts confetti. Existing databases add the `widget` comment kind with `database/add-comment-widget-kind.sql`.
- Hovering a link arrow shows the relationship: blocks, relates, and the tracker’s own phrase for custom Jira or Yandex Tracker links.
- The overdue baseline chip sits on the card side opposite the incoming link arrow.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.13.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- На свимлейне можно поставить карточку крестиков-ноликов из инструмента карточек. Законченная партия сыплет конфетти. Для уже существующей БД тип комментария `widget` добавляется скриптом `database/add-comment-widget-kind.sql`.
- При наведении на стрелку связи показывается её тип: блокирует, связана, а для своих фраз Jira и Яндекс Трекера — текст трекера.
- Чип просроченного бейзлайна встаёт на сторону карточки, противоположную входящей стрелке.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.13.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.12.0] — 2026-10-13

### English

- Task card fields sit in slots: drag them into place, hide them, and choose how each one is drawn. Narrow cards can drop the header, the title lead, or the footer by width.
- Tracker fields can be added to the card by name, with short labels for their values.
- When a plan runs past the last sprint cell, the timeline grows and the overflow is marked as an overtime graveyard.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.12.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Поля карточки задачи лежат в слотах: их можно перетаскивать, скрывать и выбирать способ отрисовки. На узких карточках шапка, начало заголовка и подвал прячутся по ширине.
- Поля трекера добавляются на карточку по имени, с короткими подписями значений.
- Если план вылезает за последнюю ячейку спринта, шкала растягивается, а хвост помечается как кладбище переработок.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.12.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.11.1] — 2026-10-12

### English

- The planner browser tab keeps the sprint name and team label; a short sprint number is no longer the whole title. Next.js no longer overwrites it with the static «Sprints» title after navigation.
- The backlog tab shows the backlog label.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.11.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Вкладка браузера в планере держит имя спринта и подпись команды; короткий номер спринта больше не остаётся единственным текстом. Next.js больше не затирает его статическим «Спринты» после перехода.
- На вкладке бэклога показывается подпись бэклога.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.11.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.11.0] — 2026-10-11

### English

- Task cards show a due-date chip; a past date is marked overdue until the task is completed.
- Dropping a task onto a kanban column that maps to several statuses opens a choice of the available transitions.
- Swimlane arrows are drawn only when both ends are placed on the board, and they redraw after a card moves to another lane.
- The overdue baseline chip shifts down when a link arrow crosses the card center.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.11.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- На карточке задачи показывается срок; прошедшая дата помечается как просроченная, пока задача не закрыта.
- Если колонка канбана соответствует нескольким статусам, при дропе открывается выбор доступного перехода.
- Стрелки свимлейна рисуются только когда оба конца стоят на доске и перерисовываются после переноса карточки в другую дорожку.
- Чип просроченного бейзлайна сдвигается вниз, если стрелка связи проходит через центр карточки.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.11.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.10.0] — 2026-10-11

### English

- Tracker provider and API URL are chosen per organization on registration and in admin «Tracker», and stored in the database instead of instance-wide `ISSUE_TRACKER_PROVIDER` and `TRACKER_API_URL`.
- The organization tracker token is stored encrypted in the database; there is no `TRACKER_OAUTH_TOKEN` environment fallback.
- The tracker type can be changed until the first sync, then it is locked.
- Existing databases can copy the previous env provider and API URL with `database/add-organization-issue-tracker-settings.sql`.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.10.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Тип трекера и URL API выбираются на организацию при регистрации и в админке «Трекер» и хранятся в БД вместо общих `ISSUE_TRACKER_PROVIDER` и `TRACKER_API_URL`.
- Токен организации хранится в БД в зашифрованном виде; переменной окружения `TRACKER_OAUTH_TOKEN` больше нет.
- Тип трекера можно менять до первой синхронизации, после неё он фиксируется.
- Для уже существующей БД прежние значения из env переносятся скриптом `database/add-organization-issue-tracker-settings.sql`.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.10.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.9.0] — 2026-10-11

### English

- Swimlane drag-and-drop shows a drop preview of where the task will land; cell hover lives in a per-frame store so untouched rows do not re-render.
- Availability events (vacation, sick leave, duty, tech sprint) are created and edited in a popover on the lane instead of a modal.
- Availability cards and hatched cells get an emoji pattern per absence type that scales with row height.
- Sprint score mugs are shown in the sprint planner controls bar.
- Overdue baseline strips and task card layout polish.
- App version label shows the semver only (git SHA removed).
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.9.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- При перетаскивании в свимлейне показывается превью места дропа; ячейка под курсором хранится в сторе с обновлением раз в кадр, незатронутые строки не перерисовываются.
- События отсутствия (отпуск, больничный, дежурство, техспринт) заводятся и правятся в поповере на дорожке вместо модалки.
- Карточки отсутствия и заштрихованные ячейки получили эмодзи-узор по типу отсутствия, масштабируемый по высоте строки.
- Кружки скора спринта отображаются на панели управления планера.
- Полировка полос просроченного baseline и раскладки карточек задач.
- Метка версии приложения показывает только semver (git SHA убран).
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.9.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.8.0] — 2026-10-11

### English

- Task info sidebar shows assignee, priority, story/test points, and type as meta fields.
- Runtime S3 object-storage detection (`isS3Configured`) exposed to the client for upload UI.
- Hide the tracker token settings tab for Jira Cloud; users reconnect via «Continue with Atlassian».
- Planner onboarding is tour-only (tip layer removed); shared planner clock replaces now-line helpers.
- Swimlane placement toolbar, quick-add menu, and settings modal polish.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.8.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- В сайдбаре задачи — метаполя: исполнитель, приоритет, story/test points и тип.
- Определение S3 object storage в runtime (`isS3Configured`) доступно клиенту для UI загрузок.
- Вкладка токена трекера в настройках скрыта для Jira Cloud; переподключение через «Продолжить с Atlassian».
- Онбординг планера только как тур (слой tip убран); общий planner clock вместо хелперов now-line.
- Полировка тулбара размещения свимлейнов, quick-add меню и модалки настроек.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.8.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.7.2] — 2026-10-11

### English

- Fix planner task links overlapping pinned swimlane rows while scrolling: clip-layer arrows only for links that touch the pinned assignee; denser glass so the global arrow layer does not show through.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.7.2` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Исправление связей в планере поверх закреплённых строк при скролле: в clip-слое только связи, касающиеся задач этой строки; плотнее стекло, чтобы общий слой стрелок не просвечивал.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.7.2` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.7.1] — 2026-10-11

### English

- Fix Atlassian OAuth credentials: read `ATLASSIAN_OAUTH_CLIENT_ID` / `SECRET` at runtime so Docker Hub images are not stuck with empty build-time values.
- Clarify Jira Cloud docs and copy: user «Continue with Atlassian»; org admin still uses email + API token.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.7.1` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Исправление учёток Atlassian OAuth: `ATLASSIAN_OAUTH_CLIENT_ID` / `SECRET` читаются в runtime, чтобы образы Docker Hub не залипали с пустыми значениями со сборки.
- Уточнены docs и копирайт Jira Cloud: пользователь — «Продолжить с Atlassian»; орг — email + API-токен.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.7.1` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.7.0] — 2026-10-11

### English

- Atlassian OAuth for Jira Cloud: «Continue with Atlassian» on auth-setup and register; token refresh; org still uses email + API token for sync.
- Registration and session flows accept OAuth-backed Jira Cloud identity; token paste remains for on-prem / PAT and org admin.
- Retro board horizontal scroll via mouse wheel; planner and admin UI polish around tracker connection.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.7.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Atlassian OAuth для Jira Cloud: «Продолжить с Atlassian» на auth-setup и register; обновление токена; орг по-прежнему email + API-токен для sync.
- Регистрация и сессии принимают OAuth-идентичность Jira Cloud; вставка токена остаётся для on-prem / PAT и админки организации.
- Горизонтальный скролл доски ретро колесом мыши; полировка UI планера и админки вокруг подключения трекера.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.7.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.6.0] — 2026-10-08

### English

- Planner sync with Tracker: clear schedule dates when a task leaves the plan; issue-link overlay and batch fetch for sprint links.
- Kanban chrome polish; DB migrations respect `BEER_TRACKER_SCHEMA` via `scripts/db/psql-with-schema.sh`.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.6.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Синхронизация планера с Tracker: очистка дат расписания при снятии задачи с плана; оверлей связей и batch-загрузка ссылок спринта.
- Полировка chrome канбана; миграции БД учитывают `BEER_TRACKER_SCHEMA` через `scripts/db/psql-with-schema.sh`.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.6.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.5.0] — 2026-10-08

### English

- Issue links in the task sidebar (list, add, remove) with Tracker provider support.
- Kanban and backlog UI chrome polish; board columns cached on server and client (they change rarely).
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.5.0` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Связи задач в сайдбаре задачи (список, добавление, удаление) с поддержкой провайдера Tracker.
- Полировка chrome канбана и бэклога; колонки доски кэшируются на сервере и клиенте (меняются редко).
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.5.0` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.4.2] — 2026-10-08

### English

- Planner and task card UI polish: resize handles, overdue baseline strips, timeline scale, and status mapping.
- Docker Hub images `dinkimom/beer-tracker` and `dinkimom/beer-tracker-sync-worker` tags `1.4.2` and `latest` (`linux/amd64`, `linux/arm64`).

### Русский

- Полировка UI планера и карточки задачи: ресайз-ручки, полоски overdue baseline, шкала таймлайна, маппинг статусов.
- Образы Docker Hub `dinkimom/beer-tracker` и `dinkimom/beer-tracker-sync-worker`, теги `1.4.2` и `latest` (`linux/amd64`, `linux/arm64`).

## [1.4.0] — 2026-10-06

### English

**Install**
- Images on Docker Hub: [`dinkimom/beer-tracker`](https://hub.docker.com/r/dinkimom/beer-tracker) and [`dinkimom/beer-tracker-sync-worker`](https://hub.docker.com/r/dinkimom/beer-tracker-sync-worker). Tags `1.4.0` and `latest` each include `linux/amd64` and `linux/arm64`.
- `docker compose -f docker-compose.yml -f docker-compose.hub.yml up -d` runs those images with Postgres and Redis from the existing compose file. `latest` tracks the newest publish; pin `1.4.0` for this release.

**Planner**
- Planner, sidebar, and shared controls use the glass / island layout.
- A swimlane header shows average velocity from recent sprints (completed story points and test points).
- Plan edits can stay a draft, then be saved or discarded. The plan from when work started remains as an anchor on the lane.
- The current timeslot is marked on the day header.
- Moving to blocked, when the workflow asks for a transition screen, opens that dialog.

**Retro and admin**
- Sprint retrospective board.
- Staff registry updates. Legacy admin tabs are removed. Tracker integration, including the Jira platform field, lives in the integration section.
- Admin pages require an authorized session.

**Fixes**
- A new sprint goal and a card color update arrive over the live stream.
- Nested menus stay open while the pointer moves into the submenu.

### Русский

**Установка**
- Образы на Docker Hub: [`dinkimom/beer-tracker`](https://hub.docker.com/r/dinkimom/beer-tracker) и [`dinkimom/beer-tracker-sync-worker`](https://hub.docker.com/r/dinkimom/beer-tracker-sync-worker). Теги `1.4.0` и `latest` содержат `linux/amd64` и `linux/arm64`.
- `docker compose -f docker-compose.yml -f docker-compose.hub.yml up -d` поднимает эти образы вместе с Postgres и Redis из текущего compose-файла. `latest` — последняя публикация; `1.4.0` фиксирует этот релиз.

**Планер**
- Планер, сайдбар и общие контролы переведены на стеклянный и островной вид.
- В шапке свимлейна видно средний велосити по недавним спринтам (закрытые story points и test points).
- Правки плана можно держать черновиком, затем сохранить или отменить. План на момент старта работы остаётся якорем на дорожке.
- Текущий таймслот отмечен в шапке дней.
- Переход в blocked, если workflow просит экран перехода, открывает этот диалог.

**Ретро и админка**
- Доска ретроспективы спринта.
- Доработан реестр сотрудников. Легаси-вкладки админки убраны. Интеграция с трекером, включая поле платформы в Jira, живёт в разделе интеграции.
- Страницы админки открываются только с авторизованной сессией.

**Исправления**
- Новая цель спринта и смена цвета карточки приходят по живому потоку.
- Вложенные меню не закрываются, пока указатель переходит в подменю.

## [1.3.0] — 2026-09-25

### English

**Planner onboarding**
- The first visit to the planner (by people, by features, or compact) opens a short welcome. The tour walks through rows, sprint days, the task card, resize, drag, moving a card between people, links, and the context menu. A sample card (“Onboarding”) sits on a demo row for the steps that need it. The row and the card exist only during the tour and are not saved to the sprint.
- In “By features”, a row is a parent and the assignee stays on the card. The same tour follows that layout.
- After the tour, a one-time tip appears the first time you use the task tool, links, the features view, or layers.
- The toolbar control “How the planner works” starts the tour again. Skip closes it. Progress stays in the browser.

**Synchronization**
- Admin → Synchronization (`/admin/sync`): team queues stay in the export. Search adds extra queues and projects, and those are exported too. The raw debug block is gone.
- Jira Cloud issue search uses `/search/jql` (Cloud removed `POST /rest/api/3/search`). The import count comes from approximate-count, and pages follow `nextPageToken`. Jira Data Center still uses `/search`.
- Jira Cloud comments stored as ADF are turned into markdown, so the fact timeline and comment text stay readable.
- A status change whose workflow marks fields required, but has no transition screen, shows those empty fields in the planner. They are written on the issue before the transition. Fields that already have a value are left as they are.

**Planner**
- Durations on the fact timeline use the UI language (`d` / `h` / `m` in English, `д` / `ч` / `м` in Russian).
- The company setup page has a language switch.

### Русский

**Онбординг планера**
- Первый заход в планер (по людям, по фичам или компактный) открывает короткое приветствие. Тур показывает строки, дни спринта, карточку задачи, ресайз, перетаскивание, перенос между людьми, связи и контекстное меню. Для шагов, которым нужна карточка, на демо-строку кладётся пример «Онбординг». Строка и карточка живут только во время тура и в спринт не сохраняются.
- В режиме «По фичам» строка — родитель, исполнитель остаётся на карточке. Тур идёт по этой раскладке.
- После тура одноразовая подсказка появляется при первом использовании инструмента задачи, связей, вида по фичам или слоёв.
- Кнопка «Как устроен планер» в тулбаре запускает тур снова. «Пропустить» закрывает его. Прогресс хранится в браузере.

**Синхронизация**
- Админка → Синхронизация (`/admin/sync`): очереди команд по-прежнему входят в выгрузку. Поиском можно добавить ещё очереди и проекты — они тоже выгружаются. Сырой отладочный блок убран.
- Поиск задач Jira Cloud идёт через `/search/jql` (Cloud снял `POST /rest/api/3/search`). Число задач берётся из approximate-count, страницы идут по `nextPageToken`. Jira Data Center по-прежнему ходит в `/search`.
- Комментарии Jira Cloud в формате ADF переводятся в markdown, чтобы факт и текст комментария оставались читаемыми.
- Смена статуса, у которой в workflow есть обязательные поля, но нет экрана перехода, показывает в планере пустые из этих полей. Они записываются в задачу до перехода. Уже заполненные поля не трогаются.

**Планер**
- Длительность на таймлайне факта берёт подписи из языка интерфейса (`d` / `h` / `m` по-английски, `д` / `ч` / `м` по-русски).
- На странице настройки компании есть переключатель языка.

## [1.2.0] — 2026-09-24

### English

**Planner grid**
- Each organization chooses how the working day (09:00–18:00) is split: 2, 3, or 4 equal timeslots. The default stays 3, with the previous story-point ladder (1 SP is one timeslot).
- Admin → Planner (`/admin/planner`): one SP can mean one timeslot, one working day, or a custom table. In the custom table, card length in timeslots maps to story points, and the next step does not have to be a multiple of the previous one. A preview shows story points, timeslots, and days.
- Changing the slot count rescales planned cards, phase segments, and stickers by the fraction of the day. Whole days stay whole days. Estimates in Tracker and Jira are not rewritten. Save asks for confirmation and shows how many items will move.
- A card sized on the previous scale keeps its estimate while you resize it, until its length matches the new scale.
- Saving a new slot count widens the day-part checks in the database. The same statements are in `database/widen-planner-part-checks.sql` for an existing database.

### Русский

**Сетка планера**
- Организация сама задаёт, как делится рабочий день (09:00–18:00): на 2, 3 или 4 равных таймслота. По умолчанию по-прежнему 3 и прежняя лестница оценок (1 SP — один таймслот).
- Админка → Планер (`/admin/planner`): один SP может быть одним таймслотом, одним рабочим днём или своей таблицей. В своей таблице длина карточки в таймслотах задаёт сторипоинты, и следующий шаг не обязан быть кратным предыдущему. Превью показывает SP, таймслоты и сутки.
- Смена числа слотов пересчитывает запланированные карточки, отрезки фаз и стикеры по доле дня. Целые сутки остаются целыми сутками. Оценки в Tracker и Jira не переписываются. Перед сохранением видно, сколько позиций сдвинется, и нужно подтверждение.
- Карточка, длина которой снята со старой шкалы, при ресайзе сохраняет оценку, пока длина не совпадёт с новой шкалой.
- Сохранение новой сетки само расширяет проверки части дня в БД. Те же операторы — в `database/widen-planner-part-checks.sql` для уже существующей базы.

## [1.1.0] — 2026-09-22

### English

**MCP and agent planning**
- Remote MCP at `/api/mcp` (Streamable HTTP) plus a stdio helper in `apps/mcp-sprint-context`.
- Agents can search sprints, load the planning graph (`get_sprint_context` / `get_feature_context`), inspect capacity, and resolve people by name or email.
- Write path is explicit: `propose_plan_patch` (dry-run + HMAC token) then `apply_plan_patch` with confirm. No silent writes; Tracker/Jira tickets are not mutated.
- `createNote` in a propose lands on the board immediately as a **draft** (translucent sticker, “Agent” badge, 30 min TTL). Approve or reject in the UI; apply confirms remaining drafts.

**Planner**
- Mode toolbar shortcuts: `Ctrl` / `⌘` + `1`…`7` (cursor, link, task, note, photo, diagram, time off). Escape still returns to the cursor.
- Hovering a mode or undo/redo control shows the shortcut in a custom tooltip (delayed so it does not flicker during fast clicks). The tooltip slides in and out.
- Undo / redo of the plan still uses `Ctrl` / `⌘+Z` and `Ctrl+Shift+Z` / `⇧⌘Z`, including note layout and feature-lane parents.
- Per-sticker and bulk approve/reject for agent draft notes; pending-approval chrome on the card.

**Platform**
- Pushing tag `vX.Y.Z` creates a GitHub Release when `package.json` matches the tag.
- CI runs on `main` / `master`.
- Tracker client id is configured via environment variables.
- Docs for sprint-context MCP and public distribution.

Setup: [docs/SPRINT_CONTEXT.md](./docs/SPRINT_CONTEXT.md), `.cursor/mcp.json.example`, `SPRINT_CONTEXT_MCP_SECRET` in `env.example`.

### Русский

**MCP и агентское планирование**
- Удалённый MCP на `/api/mcp` (Streamable HTTP) и stdio-клиент в `apps/mcp-sprint-context`.
- Агент ищет спринты, читает planning graph (`get_sprint_context` / `get_feature_context`), смотрит capacity и резолвит людей по имени или email.
- Запись только явно: `propose_plan_patch` (dry-run + HMAC-токен), затем `apply_plan_patch` с confirm. Тихих записей нет; тикеты Tracker/Jira не меняются.
- `createNote` при propose сразу кладёт на доску **драфт** (полупрозрачный стикер, бейдж «Агент», TTL 30 мин). В UI можно принять или отклонить; apply подтверждает оставшиеся драфты.

**Планер**
- Шорткаты тулбара режимов: `Ctrl` / `⌘` + `1`…`7` (курсор, связь, задача, заметка, фото, схема, отсутствие). Escape по-прежнему возвращает курсор.
- Наведение на режим или назад/вперёд показывает сочетание в кастомном тултипе (с задержкой, без мелькания при быстрых кликах). Появление и исчезновение анимированы.
- Отмена / повтор плана — `Ctrl` / `⌘+Z` и `Ctrl+Shift+Z` / `⇧⌘Z`, включая раскладку заметок и parent в режиме «По фичам».
- Принятие и отклонение агентских драфт-заметок по одной и пачкой; индикация «ожидает апрув» на карточке.

**Платформа**
- Push тега `vX.Y.Z` создаёт GitHub Release, если версия в `package.json` совпадает с тегом.
- CI на `main` / `master`.
- Client id трекера задаётся переменными окружения.
- Документация по sprint-context MCP и публичной поставке.

Настройка: [docs/SPRINT_CONTEXT.md](./docs/SPRINT_CONTEXT.md), `.cursor/mcp.json.example`, `SPRINT_CONTEXT_MCP_SECRET` в `env.example`.

## [1.0.0] — 2026-09-21

### English

Initial public snapshot: Apache-2.0 self-hosted Beer Tracker (sprint planner on Yandex Tracker or Jira).

### Русский

Первый публичный снимок: self-hosted Beer Tracker (планер спринтов поверх Яндекс Трекера или Jira), лицензия Apache-2.0.
