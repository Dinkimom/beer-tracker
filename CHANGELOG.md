# Changelog

Notable changes to Beer Tracker, newest first. English first, then Russian.

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
