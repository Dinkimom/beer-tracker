# Changelog

Notable changes to Beer Tracker, newest first. English first, then Russian.

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
