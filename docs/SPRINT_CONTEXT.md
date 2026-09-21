# Sprint context (agent planning graph)

Read-only snapshot of Beer Tracker’s **planning graph** for a sprint — layout by day/segment, feature lanes, notes (with diagram text), task arrows, sprint goals, and availability. Not a Tracker/Jira ticket proxy (statuses/summaries stay with the tracker MCP).

## Endpoint (JSON)

```http
GET /api/sprints/{sprintId}/sprint-context
GET /api/sprints/{sprintId}/sprint-context?featureId={laneOrIssueKey}
```

- Cache: `Cache-Control: private, no-store`
- Optional `featureId`: narrows positions, notes, links, and feature-lanes. Sprint goals stay sprint-level.
- **Org id не нужен** (одна организация на инстанс).

### Auth

1. **MCP / агент:** `Authorization: Bearer <SPRINT_CONTEXT_MCP_SECRET>` или `X-Sprint-Context-Secret`. Секрет в `.env` инстанса. Soft tracker meta — из сохранённого токена org.
2. **UI:** обычный tenant (`requireTenantContext`).

Если `SPRINT_CONTEXT_MCP_SECRET` пуст, Bearer MCP не принимается.

## Remote MCP (рекомендуется)

MCP крутится **на хосте/контейнере Beer Tracker** — клон репо на машине агента не нужен.

```http
POST|GET|DELETE /api/mcp
```

Streamable HTTP, tools:
- `search_sprints(query, boardId?, limit?)` — найти спринт по фрагменту имени («Sprint 31», «RND Team 1»)
- `get_sprint_context(sprintId, featureId?)` — planning graph по **числовому** sprintId (включая `capacity`)
- `get_sprint_capacity(sprintId, featureId?)` — только capacity: overlaps / gaps / overloaded
- `get_feature_context(sprintId, featureId)` — тот же graph, но `featureId` обязателен
- `resolve_person(query)` — имя/email → `staffUid` / `assigneeId` (`staff:uuid`)
- `propose_plan_patch(sprintId, ops)` — dry-run patch (без записи); summary + capacityPreview + `applyToken` (TTL 30 мин)
- `apply_plan_patch(sprintId, ops, applyToken, confirm=true)` — запись только после propose + явного confirm

Типичный диалог: пользователь помнит «спринт 31» → агент `search_sprints` → берёт `hits[].sprintId` → `get_sprint_context` / `get_sprint_capacity`. Номер в названии ≠ id (например «Sprint 31» может быть id `1152`).

### Plan patch (write, не silent)

1. Агент собирает `ops[]` (max 50) после research.
2. `propose_plan_patch` — валидация + preview capacity + HMAC `applyToken`.
3. Человек/агент ревьюит `summary` / `capacityPreview`.
4. `apply_plan_patch` с **теми же** `ops` + `applyToken` + `confirm: true`.

Supported ops: `upsertPosition`, `deletePosition`, `createNote`, `updateNote`, `deleteNote`, `upsertLink`, `deleteLink`, `upsertFeatureDraft`, `createGoal`, `updateGoal`, `deleteGoal`.

Notes: только `kind=text`; defaults `width=200`, `height=3`; кладутся по `assigneeId` + `day` + `part`.

**Нет** sync assignee/planned dates в Tracker/Jira. Diagram/image notes и UI-inbox approve — вне этого среза (UI approve — следующая волна).

### Cursor / Claude — только URL + секрет

[`.cursor/mcp.json.example`](../.cursor/mcp.json.example):

```json
{
  "mcpServers": {
    "beer-tracker-planning": {
      "url": "https://<your-bt-host>/api/mcp",
      "headers": {
        "Authorization": "Bearer <SPRINT_CONTEXT_MCP_SECRET>"
      }
    }
  }
}
```

**Claude Desktop** (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`) — тот же фрагмент внутри `mcpServers`.

**Claude Code:**

```bash
claude mcp add --transport http beer-tracker-sprint-context \
  --header "Authorization: Bearer <SPRINT_CONTEXT_MCP_SECRET>" \
  https://<your-bt-host>/api/mcp
```

(точный флаг `--transport` смотрите в `claude mcp add --help` своей версии.)

Выдать пользователю: URL инстанса + секрет. Node/pnpm/клон репо не требуются.

## curl

```bash
curl -sS \
  -H "Authorization: Bearer $SPRINT_CONTEXT_MCP_SECRET" \
  "https://<host>/api/sprints/123/sprint-context"
```

## Response (schemaVersion 2)

| Field | Meaning |
|-------|---------|
| `meta` | `schemaVersion`, `sprintId`, `organizationId`, legend, optional `sprintWindow` + `boardId` + `featureId`, `calendarDays[]` (`day`→`YYYY-MM-DD`), `warnings[]` |
| `positions` | Placements + `assigneeName`/`assigneeEmail`, `summary`/`issueType`/`parentKey` (soft from tracker) |
| `agenda` | Sorted timeline view: day/part/date + task + assignee name + summary |
| `capacity` | Per-person load vs free parts, overlaps, gaps, overloaded days (incl. work while unavailable) |
| `featureLanes` | `draftRows`, `orderIds`, `hiddenIds` |
| `notes` | Notes / diagrams / images; diagrams may include `diagramText[]` |
| `taskLinks` | Arrows |
| `sprintGoals` | `{ delivery: [], discovery: [] }` |
| `availability` | Board events overlapping sprint window when known |

`day` = working-day index; `part` = time segment `0 .. PARTS_PER_DAY-1` (currently 3 parts/day).

## Optional: local stdio

`pnpm mcp:sprint-context` — HTTP-клиент к `BEER_TRACKER_URL` для отладки без remote MCP. Обычным пользователям не нужен.
