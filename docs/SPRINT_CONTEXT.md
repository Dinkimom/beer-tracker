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
- `search_sprints(query, boardId?, limit?)` — найти спринт по фрагменту имени («Sprint 31», «RND Team 1»)
- `get_sprint_context(sprintId, featureId?, assigneeId?, taskIds?)` — planning graph по **числовому** sprintId (включая `capacity`, `meta.partsPerDay`, `planVsActual`, статусы и `sprintHistory` на позициях)
- `get_sprint_capacity(sprintId, featureId?, assigneeId?)` — только capacity: overlaps / gaps / overloaded
- `get_feature_context(sprintId, featureId)` — тот же graph, но `featureId` обязателен
- `search_issues(query?, boardId?, sprintId?, status?, assignee?, limit?)` — поиск задач на доске/бэклоге (оценка, статус, assignee)
- `resolve_person(query)` — имя/email → `staffUid` / `assigneeId` (`staff:uuid`)
- `propose_plan_patch(sprintId, ops, persistNotes?)` — dry-run; `schedule[]`, `warnings`, capacityPreview, `persistNotes`, applyToken
- `apply_plan_patch(sprintId, ops, applyToken, confirm=true, onError?)` — запись после propose + confirm; `onError=stop|continue`; `schedule[]` после apply

Типичный диалог: пользователь помнит «спринт 31» → агент `search_sprints` → берёт `hits[].sprintId` → `get_sprint_context` / `get_sprint_capacity`. Номер в названии ≠ id (например «Sprint 31» может быть id `1152`).

### Plan patch (write, не silent)

1. Агент собирает `ops[]` (max 50) после research. Индексы `startPart` / `part` — `0 .. meta.partsPerDay-1` (из настроек орги).
2. `propose_plan_patch` — валидация сетки + **preflight** (missing note/goal → `preflight_failed`) + preview capacity + `schedule` + HMAC `applyToken`. По умолчанию **`createNote` пишется сразу** как pending (полупрозрачные стикеры, TTL 30 мин). `persistNotes: false` — чистый dry-run без записи заметок (createNote только на apply). Заметки **не** резервируют capacity.
3. Человек ревьюит заметки (если были) / `summary` / `schedule` / `capacityPreview` / `warnings`.
4. `apply_plan_patch` с **теми же** `ops` + `applyToken` + `confirm: true`. `onError: stop` (default) — стоп на первой ошибке; `continue` — остальные ops применяются, ошибки в `applied[]`.

Supported ops: `upsertPosition`, `deletePosition`, `createNote`, `updateNote`, `deleteNote`, `upsertLink`, `deleteLink`, `upsertFeatureDraft`, `createGoal`, `updateGoal`, `deleteGoal`.

**Резерв времени** — только задача через `upsertPosition` (start + duration в слотах). Sticky notes можно пересекать с задачами; они не занимают слоты в `capacity`.

`upsertPosition.syncToTracker=true` — дополнительно `addIssueToSprint` + assign в Tracker/Jira (позиция в BT пишется всегда; ошибка sync — в `applied[].detail` / warning). Без флага — только планировщик BT; propose предупредит `issue_not_in_sprint: KEY`, если задачи нет на доске спринта.

Notes: только `kind=text`; default `width=200` (2 части); `height` как у задачи. В context: `updatedAt` / `updatedBy` / `version`; soft-delete. `updateNote.ifVersion` — optimistic lock (иначе `version conflict`). Для `upsertLink` на заметку — `comment:{notes[].id}`.

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

DB: применить [`database/add-mcp-oauth.sql`](../database/add-mcp-oauth.sql) (или таблицы создаются при первом обращении к OAuth).

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
| `positions` | Placements + soft tracker fields + **`planVsActual`** (`planParts` / `actualParts` / `slippedParts` / optional `carriedOver`) |
| `agenda` | Sorted timeline view: day/part/date + task + assignee name + summary |
| `capacity` | Per-person load vs free parts (**tasks only**; notes ignored), overlaps, gaps, overloaded |
| `featureLanes` | `draftRows`, `orderIds`, `hiddenIds` |
| `notes` | Notes / diagrams / images; `updatedAt` / `updatedBy` / `version`; do **not** block capacity |
| `taskLinks` | Arrows |
| `sprintGoals` | `{ delivery: [], discovery: [] }` |
| `availability` | Board events overlapping sprint window when known |

`day` = working-day index; `part` = `0 .. meta.partsPerDay-1`.

## Optional: local stdio

`pnpm mcp:sprint-context` — HTTP-клиент к `BEER_TRACKER_URL` для отладки без remote MCP. Нужен `BEER_TRACKER_MCP_ACCESS_TOKEN` (OAuth access token). Обычным пользователям не нужен — используйте remote MCP URL.
