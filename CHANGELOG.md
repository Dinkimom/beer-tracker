# Changelog

Notable changes to Beer Tracker, newest first. English first, then Russian.

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
