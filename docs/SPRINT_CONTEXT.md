# Sprint context (agent planning graph)

Read-only snapshot of Beer Tracker’s **planning graph** for a sprint — layout by day/segment, feature lanes, notes (with diagram text), task arrows, sprint goals, and availability. Not a Tracker/Jira ticket proxy (statuses/summaries stay with the tracker MCP).

## Endpoint (JSON)

```http
GET /api/sprints/{sprintId}/sprint-context
GET /api/sprints/{sprintId}/sprint-context?featureId={laneOrIssueKey}
GET /api/sprints/{sprintId}/sprint-context?assigneeId=staff:{uuid}
GET /api/sprints/{sprintId}/sprint-context?taskId=RND-1&taskId=RND-2
```

- Cache: `Cache-Control: private, no-store`
- Optional `featureId`: narrows positions, notes, links, and feature-lanes. Sprint goals stay sprint-level.
- Optional `assigneeId` / repeated `taskId`: further narrow the graph (and rebuild `capacity`).
- **Org id не нужен** (одна организация на инстанс).

### Auth

1. **MCP / агент:** `Authorization: Bearer <MCP OAuth access_token>` (после OAuth 2.1 + PKCE к инстансу). Soft tracker meta — из сохранённого токена org.
2. **UI:** обычный tenant (`requireTenantContext`).

Без валидного OAuth Bearer агентский доступ к MCP / sprint-context не принимается.

## Remote MCP (рекомендуется)

MCP крутится **на хосте/контейнере Beer Tracker** — клон репо на машине агента не нужен.

```http
POST|GET|DELETE /api/mcp
```

Streamable HTTP, **OAuth 2.1** (Beer Tracker = Authorization Server + Resource Server):

| Endpoint | Role |
|----------|------|
| `/.well-known/oauth-protected-resource` | RFC 9728 protected resource metadata |
| `/.well-known/oauth-protected-resource/api/mcp` | Path-aware PRM for `/api/mcp` |
| `/.well-known/oauth-authorization-server` | RFC 8414 AS metadata |
| `/api/oauth/register` | Dynamic client registration |
| `/api/oauth/authorize` | Auth code + PKCE (login + consent) |
| `/api/oauth/token` | Code / refresh exchange |
| `/api/oauth/revoke` | Token revocation |

Unauthenticated MCP calls return **401** with `WWW-Authenticate` pointing at resource metadata. Cursor/Claude open the browser → product login (`/auth-setup`) → consent → Bearer token.

Scope: `mcp:tools`.

Tools:
- `whoami(includeTracker?)` — текущий MCP-пользователь (userId, email, orgRole, canUsePlanner; опционально tracker `/myself`)
- `search_sprints(query, boardId?, limit?)` — найти спринт по фрагменту имени («Sprint 31», «RND Team 1»)
- `get_sprint_context(sprintId, featureId?, assigneeId?, taskIds?)` — planning graph по **числовому** sprintId (включая `capacity`, **`teamMembers`** с `role` / `roleTitle` / `platforms`, `meta.partsPerDay`, `planVsActual`, статусы / **`statusCategory`** / `sprintHistory`)
- `get_sprint_capacity(sprintId, featureId?, assigneeId?)` — capacity (overlaps / gaps / overloaded) + roster `teamMembers` с ролями
- `get_feature_context(sprintId, featureId)` — тот же graph, но `featureId` обязателен
- `search_issues(boardId, query?, status?, statusType?, …)` — поиск задач на доске/бэклоге; фильтр «в работе» — через `statusCategory` / `statusType` с эвристиками
- `get_issue(issueKey, includeComments?)` — живая задача: description, links, comments
- `get_issue_snapshot(issueKey)` — снимок из выгрузки sync (`issue_snapshots`)
- `get_task_brief(issueKey, sprintId)` — бриф задачи для агента разработки за один вызов: `issue` (как в `get_issue`) и `planning` — место в плане, `dependsOn` / `blocks` по стрелкам доски, соседи по фиче (родитель трекера или черновая фича), заметки (`linked` — стрелка к задаче, `parent` — про задачу или фичу, `nearby` — на дорожке исполнителя в окне задачи), цели спринта
- `transition_issue(issueKey, sprintId, target, comment?)` — шаг задачи по флоу команды: `in_progress` — взял в работу, `review` — готово. Статус агент не называет: он выводится из истории статусов соседних задач (та же очередь, текущий и предыдущий спринт доски) — через какой статус задачи чаще входят в работу и куда их чаще переводят дальше. Мало истории или разнобой (`not_enough_history` / `ambiguous`), команда закрывает сразу из работы (`no_review_stage`), нет перехода из текущего статуса или на экране перехода обязательные поля — статус не меняется, причина в `outcome.reason`. `comment` пишется в задачу в любом случае
- `resolve_person(query)` — имя/email → `staffUid` / `assigneeId` + `role` / `roleTitle` / `platforms` (если человек в команде)
- `propose_plan_patch(sprintId, ops, persistNotes?, replacePending?, sessionId?, replies?, draftMessage?, intent?)` — dry-run; `schedule[]`, `warnings`, capacityPreview, `persistNotes`, applyToken; драфт записывается в сессию (`agentSession` в ответе)
- `list_agent_sessions(status?, sprintId?)` — входящие агента: сессии, которые человек передал из планера
- `get_agent_session(sessionId)` — переписка сессии, `openComments`, `fetchContext`; `skill` — сценарий, вызванный в планере и ещё не отработанный (инструкция с параметрами, `lib/agentSessions/agentSkills.ts`); у реплик переписки — свой `skill`
- `reply_agent_session(sessionId, message?, replies?, close?, options?)` — ответ без нового драфта; `options` — 2–5 вариантов-кнопок под вопросом, выбор приходит следующей репликой человека
- `apply_plan_patch(sprintId, ops, applyToken, confirm=true, onError?)` — запись после propose + confirm; `onError=stop|continue`; `schedule[]` после apply
- `get_retro_board(sprintId)` — колонки и карточки ретро (без картинок): `authorName` — кто завёл, `reactions[{emoji, count, by}]` — кто какой emoji поставил (✅ — отметили сделанным); если доски ещё нет — шаблон орги без записи
- `apply_retro_board(sprintId, ops, confirm=true)` — заметки/комментарии/колонки ретро (`addNote`, `moveCard`, `addComment`, `addColumn`, …); колонка по `columnId` или `columnPreset`

**Статусы:** `statusType` — сырая категория трекера (у Jira «Ready for development» часто ошибочно `inProgress`). Для фильтров «что уже в работе» используйте **`statusCategory`**: not-started | `in-progress` | `paused` | `done` (имя статуса важнее категории; `readyfordevelopment` → not-started bucket).

Типичный диалог: пользователь помнит «спринт 31» → агент `search_sprints` → берёт `hits[].sprintId` → `get_sprint_context` / `get_sprint_capacity`. Номер в названии ≠ id (например «Sprint 31» может быть id `1152`).

### Plan patch (write, не silent)

1. Агент собирает `ops[]` (max 50) после research. Индексы `startPart` / `part` — `0 .. meta.partsPerDay-1` (из настроек орги).
2. `propose_plan_patch` — валидация сетки + **preflight** (missing note/goal → `preflight_failed`) + preview capacity + `schedule` + HMAC `applyToken`. По умолчанию **`createNote` пишется сразу** как pending (полупрозрачные стикеры, TTL 30 мин); position/goal превью тоже. Повторный propose с другими `ops` **заменяет** предыдущие pending-черновики и превью этого спринта — берите свежий `applyToken`. `persistNotes: false` — чистый dry-run без записи заметок (createNote только на apply). Заметки **не** резервируют capacity.
3. Человек ревьюит заметки (если были) / `summary` / `schedule` / `capacityPreview` / `warnings`.
4. `apply_plan_patch` с **теми же** `ops` + `applyToken` + `confirm: true`. `onError: stop` (default) — стоп на первой ошибке; `continue` — остальные ops применяются, ошибки в `applied[]`.

### Сессии с агентом и приватные драфты

**Драфты приватны.** Превью карточек и целей, черновые заметки и `pendingProposal` видит только тот, от чьего имени работал агент (владелец драфта). У каждого пользователя в спринте свой драфт: «один неподтверждённый драфт» — на пользователя, а не на спринт. Принять или отклонить драфт может только владелец.

**Сессия** — одна просьба и всё, что из неё вышло: версии драфта и переписка. Таблицы `agent_sessions` и `agent_session_messages`.

**Сессии разработки (`kind: dev`).** «Агенту» в меню карточки открывает чат по задаче: её открытую сессию или новую просьбу с плашкой задачи. В новой — «Сделать в коде»: в поле встаёт просьба «Реализуй задачу …», её можно дописать, сессия разработки создаётся по отправке. В `get_agent_session` у такой сессии своя подсказка и первый вызов — `get_task_brief`. Агент берёт задачу в работу (`transition_issue(in_progress)`), пишет код в ветке `agent/<ключ>`, гоняет проверки и коммитит; push и PR не делает. Итог — `reply_agent_session(message, result: {branch, commits, tests, filesChanged, insertions, deletions})`: в чате это карточка с веткой (копируется кликом), проверками и коммитами. Затем `transition_issue(review, comment)`. Обычные сессии — `kind: plan`. Их забирает мост, если знает репозиторий очереди задачи (Настройки → Агент, см. ниже), иначе — агент в IDE, открытой в репозитории («посмотри мои запросы в Beer Tracker»).

**Параллельные сессии.** Открытых сессий может быть сколько угодно: мост запускает агента по каждой отдельно, в планере заголовок чата открывает список сессий (кто кого ждёт, что агент делает сейчас, непрочитанный ответ) и переключает между ними. Новая сессия прежние не закрывает. Драфт на доске при этом один на человека: пока он не разобран, другая сессия план не меняет (`draft_belongs_to_other_session`) — агент отвечает в ней текстом и ждёт.

Как сессия появляется:
- в планере «Агенту»: меню карточки задачи, меню заметки или кнопка ✨ в нижнем тулбаре (про спринт целиком). Поле ввода — как в чате: Enter отправляет, Shift+Enter переносит строку, `@` упоминает задачу или человека; упоминания уходят агенту с id (`mentions`);
- агент вызвал `propose_plan_patch` без `sessionId` — сессия создаётся сама (заголовок из `intent`) или драфт идёт в сессию текущего драфта.

Цикл:
1. Человек оставляет просьбу и пишет агенту в чате «посмотри мои запросы в Beer Tracker» (фразу можно скопировать или открыть чат Claude / Cursor из планера).
2. Агент: `list_agent_sessions` → `get_agent_session(id)` → `fetchContext`.
3. План меняется через `propose_plan_patch(sessionId, replacePending: true, replies, draftMessage)`. `replies` — ответы на 💬 (`resolution: addressed | declined`), `draftMessage` — что делает эта версия. Сессия ждёт человека.
4. Человек на доске: ✓/✗ по пунктам, 💬 к пункту, «Попросить переделать» (сессия снова ждёт агента), лента «Сессия» со всей перепиской.
5. Без изменения плана агент отвечает `reply_agent_session`; `close: true` закрывает сессию.

Supported ops: `upsertPosition`, `deletePosition`, `createNote`, `updateNote`, `deleteNote`, `upsertLink`, `deleteLink`, `upsertFeatureDraft`, `createGoal`, `updateGoal`, `deleteGoal`.

**Резерв времени** — только задача через `upsertPosition` (start + duration в слотах). Sticky notes можно пересекать с задачами; они не занимают слоты в `capacity`.

**Отрезки (segments):** `upsertPosition.segments: [{ startDay, startPart, duration }, …]` — разбить задачу на несколько полос с пропусками (как «Разбить на отрезки» в UI). Правила: `startDay`/`startPart` = `segments[0]`; `duration` = сумма `segments[].duration`; `segments: []` снимает разбиение. Capacity считает только занятые части отрезков. В `schedule` несколько диапазонов через ` | `.

**Добавить задачу в план уже с отрезками:** один `upsertPosition` с `startDay`/`startPart`/`duration` + `segments` + при необходимости `syncToTracker:true`. Это тот же op, что и «положить на доску»; сегменты не требуют отдельного шага после apply.

`upsertPosition.syncToTracker=true` — дополнительно `addIssueToSprint` + assign в Tracker/Jira (позиция в BT пишется всегда; ошибка sync — в `applied[].detail` / warning). Без флага — только планировщик BT; propose предупредит `issue_not_in_sprint: KEY` и вернёт `hints` с remediation (перепредложите с `syncToTracker:true`, можно вместе с `segments`), если задачи нет на доске спринта трекера.

**Перенос в другой спринт:** `deletePosition.moveToSprintId=<id спринта трекера>` в патче исходного спринта — как «Перенести в спринт» в меню карточки. Карточка и её стрелки уходят с доски, после коммита задача добавляется в целевой спринт трекера (`addIssueToSprint`, текущий спринт той же доски снимается). Работает и для `unplannedTasks` без карточки. Пачка — по op на задачу, до 50 за патч. Ошибка трекера — в `applied[].detail`, изменения в BT остаются.

Notes: только `kind=text`; `width` — длина в частях таймлайна от `(day, part)` (1..60, default 2; значения > 60 — legacy px/100); `height` — строки свимлейна (1 = карточка задачи, по умолчанию подбирается под текст). Заметки одного исполнителя, пересекающиеся по времени, свимлейн разносит по строкам (дорожка растёт) — propose предупреждает `note_overlap` и называет первый свободный слот. В context: `authorName` (кто завёл), `reactions[{emoji, count, by}]` (кто какой emoji поставил; ✅ — отметили сделанным, заметка зеленеет), `updatedAt` / `updatedBy` / `version`; soft-delete. `updateNote.ifVersion` — optimistic lock (иначе `version conflict`). Для `upsertLink` на заметку — `comment:{notes[].id}`.

### Мост к Claude CLI (локально)

Чтобы не носить фразу в чат: `pnpm agent-bridge` поднимает на `127.0.0.1:47821` мост, а планер зовёт его, когда сессия переходит в `waiting_agent` (просьба, сообщение, «Переделать»). Мост запускает `claude -p` по этой сессии: разрешены чтение, `propose_plan_patch` и `reply_agent_session`, `apply_*` запрещены. Ссылки из чата агент читает через `WebFetch`, Notion — через `notion-search` / `notion-fetch` / `notion-query-meeting-notes` / `notion-get-self` коннектора claude.ai `claude_ai_Notion` (только чтение). В простое мост ничего не делает.

- Включить в планере: галка **«Сразу запускать в Claude CLI»** под полем ввода чата агента (флаг в localStorage; без него планер на localhost не ходит). Рядом — на связи ли мост.
- Настройки — в `.env.agent-bridge.local` (пример: [`.env.agent-bridge.example`](../.env.agent-bridge.example)). CLI мост ищет в PATH, иначе берёт свежий из расширения Claude Code в VS Code / Cursor.
- `AGENT_BRIDGE_TARGETS` — «адрес планера=MCP-сервер» через запятую: у каждого стенда свой MCP (локальный — имя из `claude mcp add`, прод через коннектор claude.ai — `claude_ai_BeerTracker`). Запросы с других Origin и Host мост отклоняет.
- **Сессии разработки.** Репозитории для задач — в планере, Настройки → Агент: папка (с подсказками из git-репозиториев, которые мост нашёл в домашней папке) и очереди задач, которые в ней делают. У одной очереди бывает несколько репозиториев (бэкенд, веб, мобилка). Мост хранит список в `~/.beer-tracker/agent-bridge.json` (`AGENT_BRIDGE_CONFIG`) и отдаёт через `GET/PUT /repos`. Новая папка работает только после «y» в терминале моста: разрешить агенту папку из браузера нельзя (без терминала — `"confirmed": true` в файле); правка очередей разрешение не сбрасывает. Если у очереди задачи несколько репозиториев, сначала идёт короткий прогон выбора: агент читает бриф и переписку, при необходимости смотрит репозитории (только чтение, `--add-dir`) и отвечает `REPO: <имя>`; не понять — спрашивает человека кнопками с именами репозиториев, ответ запускает выбор снова. Выбор и id разговора CLI мост помнит по сессии в `~/.beer-tracker/agent-bridge-sessions/`, следующие реплики идут сразу в тот же репозиторий.
- **Где и что агенту можно.** Для задачи мост делает рабочую копию `<репо>/../.bt-agent/<репо>-<ключ>` на ветке `agent/<ключ>` (от основной ветки origin) и запускает там `claude -p` в режиме `acceptEdits`: правки только внутри копии, Bash — `git status/diff/log/show/add/commit` плюс команды проверок репозитория из настроек (тесты, линтеры; агент прогоняет их до коммита) и правила `.claude/settings.json` репозитория; чтение Slack, Notion и Confluence/Jira через коннекторы claude.ai; `git push`, `gh`, `git checkout/switch/reset --hard/worktree` и правка плана запрещены. Зависимости вне git (`vendor/`, `node_modules/`) мост копирует в рабочую копию — на macOS клоном APFS, без места на диске; ссылка не годится, автозагрузка грузила бы код основной папки. Остальное, что нужно проверкам и чего нет в git (конфиги окружения, бинарники composer в `bin/`), — поле репозитория «Скопировать из основной папки»: дополняется без перезаписи. В командах проверок `{worktree}` — путь рабочей копии: например, PHP-проект без PHP на машине гоняет проверки в своём образе — `docker run --rm -v {worktree}:/app -w /app --entrypoint php <образ> bin/phpunit`. Следующая реплика человека продолжает тот же разговор CLI (`--resume`). Лимит прогона — `AGENT_BRIDGE_DEV_TIMEOUT_MIN` (60). Задачи очередей без репозитория мост не берёт: в чате остаётся фраза для агента в IDE.
- **Ревью.** `GET /workspace?sessionId=` — ветка, репозиторий, рабочая копия и живое состояние git: коммиты и файлы с +/− против основной ветки, незакоммиченное, запушено ли, ссылка на создание MR (GitLab) / PR (GitHub) по `origin`. `POST /push {sessionId}` — push ветки по клику человека в карточке результата («Запушить и открыть MR»; проверки не прошли — кнопка переспрашивает); агенту push по-прежнему запрещён. `GET /diff?sessionId=&path=` — дифф одного файла ветки (только из списка изменённых), карточка показывает его по клику на файл. Полная карточка — у последнего итога сессии, прежние свёрнуты в строку. Что агент не сделал, он перечисляет в `result.openItems` — в карточке это список «Не сделано» с кнопкой «Доделать».
- Логика: [`lib/agentSessions/agentBridge.ts`](../lib/agentSessions/agentBridge.ts) и [`agentBridgeDev.ts`](../lib/agentSessions/agentBridgeDev.ts), процесс: [`apps/agent-bridge/main.ts`](../apps/agent-bridge/main.ts).

### Cursor / Claude — только URL

[`.cursor/mcp.json.example`](../.cursor/mcp.json.example):

```json
{
  "mcpServers": {
    "beer-tracker-planning": {
      "url": "https://<your-bt-host>/api/mcp"
    }
  }
}
```

**Claude Desktop** (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`) — тот же фрагмент внутри `mcpServers`.

**Claude Code:**

```bash
claude mcp add --transport http beer-tracker-sprint-context \
  https://<your-bt-host>/api/mcp
```

(точный флаг `--transport` смотрите в `claude mcp add --help` своей версии.)

Клиент выполнит OAuth (логин в Beer Tracker + consent). Shared secret в конфиге не нужен.

DB: таблицы `mcp_oauth_*` создаёт baseline-миграция.

## curl

После OAuth (или с вручную выданным access token):

```bash
curl -sS \
  -H "Authorization: Bearer $BEER_TRACKER_MCP_ACCESS_TOKEN" \
  "https://<host>/api/sprints/123/sprint-context?assigneeId=staff:…"
```

## Response (schemaVersion 2)

| Field | Meaning |
|-------|---------|
| `meta` | `schemaVersion`, `sprintId`, `organizationId`, **`partsPerDay`** (из настроек орги), legend, optional `sprintWindow` + `boardId` + `featureId`, `calendarDays[]`, `warnings[]` |
| `positions` | Placements + soft tracker fields (`status` / `statusDisplay` / `statusType` / **`statusCategory`** / `sprintHistory`) + **`planVsActual`** |
| `agenda` | Sorted timeline view: day/part/date + task + assignee name + summary |
| `capacity` | Per-person load vs free parts (**tasks only**; notes ignored), overlaps, gaps, overloaded |
| `featureLanes` | `draftRows`, `orderIds`, `hiddenIds` |
| `notes` | Notes / diagrams / images; `width` (части), `height` (строки), `color` (у текстовых); `updatedAt` / `updatedBy` / `version`; do **not** block capacity |
| `taskLinks` | Arrows |
| `sprintGoals` | `{ delivery: [], discovery: [] }` |
| `availability` | Board events overlapping sprint window when known |

`day` = working-day index; `part` = `0 .. meta.partsPerDay-1`.

## Optional: local stdio

`pnpm mcp:sprint-context` — HTTP-клиент к `BEER_TRACKER_URL` для отладки без remote MCP. Нужен `BEER_TRACKER_MCP_ACCESS_TOKEN` (OAuth access token). Обычным пользователям не нужен — используйте remote MCP URL.
