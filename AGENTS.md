# Подсказки для ассистентов и разработчиков

## Перед тем как считать задачу сделанной

1. **`pnpm typecheck`** — без ошибок TypeScript.
2. **`pnpm lint`** — строго без ошибок и предупреждений ESLint (`--max-warnings 0`).
3. **`pnpm test`** — unit-тесты (Vitest); при изменении покрытой логики — добавить или обновить тесты.
4. **`pnpm lint:unused`** — без находок Knip (мертвый код/неиспользуемые зависимости/экспорты).
5. При изменении зависимостей или публичных API — при необходимости **`pnpm build`**.

Эти шаги обязательны для ассистентов-агентов перед завершением задачи: если какой-то этап не удалось запустить локально, явно зафиксировать это в ответе и указать причину.
Предупреждения по качеству считаются блокирующими и должны устраняться как ошибки.

## Команды

| Команда | Назначение |
|---------|------------|
| `pnpm lint` | ESLint по проекту |
| `pnpm lint:fix` | ESLint с автоисправлением |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (`vitest run`) и затем **`pnpm check:i18n`** (паритет ключей ru/en) |
| `pnpm check:i18n` | Паритет ключей ru/en + проверка английских листьев (пустые строки, TODO/TBD/FIXME); исключения — `scripts/i18n/english-quality-allowlist.json` |
| `pnpm i18n:export` | Экспорт `en`/`ru` в плоский JSON для офлайн-перевода (см. `scripts/i18n/README.md`) |
| `pnpm i18n:import` | Слияние правок из JSON обратно в `en.ts` / `ru.ts` |
| `pnpm test:watch` | Vitest в режиме watch |
| `pnpm sync-worker` | BullMQ-воркер синхронизации (отдельный процесс) |
| `pnpm sync-worker:build` | Бандл воркера в `dist/sync-worker` (Docker target `sync-worker`) |
| `pnpm lint:unused` | Knip: неиспользуемые файлы/зависимости |
| `pnpm build` | Production-сборка Next.js |
| `pnpm storybook` | Витрина UI (Storybook, порт 6006) |
| `pnpm build-storybook` | Статическая сборка Storybook в `storybook-static/` (каталог в `.gitignore`) |

Локализация UI (ключи, словари, когда гонять `check:i18n`): **[`scripts/i18n/README.md`](./scripts/i18n/README.md)**.

## Дизайн-система и общие компоненты

- Перед добавлением нового атома UI: поиск в [`components/`](./components/) и в [каталоге спеки](.spec-workflow/specs/project-design-review/COMPONENT_CATALOG.md); по возможности расширять существующий примитив.
- Семантические CSS-токены (бордеры шапки, muted-текст, тосты): [`app/globals.css`](./app/globals.css) (`--ds-*`, `--toast-*`); краткий перечень — в каталоге спеки.
- Сториз для ключевых примитивов: `components/*.stories.tsx`, запуск `pnpm storybook`.

## Архитектура данных (кратко)

Полная карта: **[ARCHITECTURE.md](./ARCHITECTURE.md)** — React Query (задачи спринта, доски), MobX (позиции, UI планера), локальный стейт + `useDebouncedApiSync` (связи, комментарии), паттерн «локальный список задач в планере + оптимистичные правки».

**Клиент:** UI ходит в `/api/*` только через [`lib/api/*`](./lib/api/) (`getPlannerBeerTrackerApi`); DTO ответов — в `lib/api/types` / `lib/<domain>`, не в `app/api/**/route.ts`. Бэклог выравнивания: [`docs/ARCHITECTURE_UNIFORMITY.md`](./docs/ARCHITECTURE_UNIFORMITY.md).

## API routes и доступ к БД

**`app/api/**/route.ts` — тонкий HTTP-слой.** Роут: tenant/auth, parse/validate body, status codes, `NextResponse`, инвалидация кэша. **Не пишет SQL** и не импортирует `query` / `pool` из `@/lib/db`.

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Route | `app/api/**/route.ts` | HTTP, Zod, auth, кэш API |
| Route helpers / services | `lib/<domain>/*` | оркестрация без SQL (`*RouteHelpers`, admin sync/teams и т.п.) |
| Repository / service | `lib/<domain>/*Repository.ts` | SQL, транзакции, маппинг строк |
| Client | `lib/api/*` | axios → `beerTrackerApi`; UI без raw `fetch('/api/...')` |

**Новый код:** SQL и оркестрация HTTP-роутов — только в `lib/<domain>/`, не рядом с `route.ts`. Образцы: [`lib/sprints/`](./lib/sprints/), [`lib/admin/`](./lib/admin/), [`lib/issues/`](./lib/issues/), [`lib/features/`](./lib/features/), [`lib/quarterlyPlans/`](./lib/quarterlyPlans/), [`lib/stories/`](./lib/stories/), [`lib/sprintGoals/`](./lib/sprintGoals/), [`lib/organizations/`](./lib/organizations/), [`lib/staffTeams/`](./lib/staffTeams/).

**Легаси:** при касании route с inline SQL — вынести в repository в том же PR.

**ESLint:** `app/api/**` — запрет `query`/`pool`/`runBeerTrackerTransaction`/`qualifyBeerTrackerTables` из `@/lib/db` (`api/no-direct-db`). UI/`lib` — запрет импортов из `@/app/api/**` и `beerTrackerApi` из `@/lib/axios` (`layers/no-app-api-import`).

**Исключения:** транзакции целиком в repository; route не вызывает `pool.connect()`.

## Слои: MobX, dnd-kit, `lib/`

- **MobX (`lib/layers/application/mobx/`, сторы в `lib/layers/application/mobx/stores/`, корневой `createRootStore` рядом)** — доменное состояние приложения: позиции задач, UI-сессия планера, согласование с API (поколения ответов, оптимистичные правки). В планере позиции удобнее брать через [`hooks/useTaskPositionsApi.ts`](./hooks/useTaskPositionsApi.ts) (фасад на `TaskPositionsStore`). Не класть сюда жизненный цикл одного жеста drag, если он полностью задаётся dnd-kit.
- **`SprintPlannerUiStore`** — преходящий UI основного планера спринта (поиск по имени, контекстное меню, hover, сегменты фаз, фокус редактирования комментария, модалка учёта работ). Сброс при смене спринта: `clearTransientUiOnSprintChange`. Листья и хуки могут читать стор через `useRootStore().sprintPlannerUi` там, где это уже сделано (канбан, свимлейны, модалки, шапка).
- **`OccupancyView` + `usePlannerUiStore`** — при `usePlannerUiStore: true` (только основной `SprintPlanner`) поля фильтра/меню/сегментов/комментария берутся из `SprintPlannerUiStore`; при `false` или без флага — только из пропсов (эпики и внешние экраны со своим поиском не смешиваются с глобальным стором). Разрешение полей вынесено в `occupancyPlannerUiResolve.ts` для тестов и единой логики.
- **dnd-kit + React** — перетаскивание в UI: `active` / `over`, сброс в `onDragEnd` / `onDragCancel` / `onDragAbort`. Общие правила маршрутизации для планера спринта — `features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts` (не дублировать логику между shell и хуками).
- **`lib/` (геометрия, парсеры, чистые функции)** — без зависимостей от MobX и React; тестируемые unit-тестами без рендера.

## Конвенции

- Следовать существующим паттернам в соседних файлах (именование, импорты, стиль компонентов).
- Не добавлять лишние зависимости без необходимости; неиспользуемый код удалять, а не «заглушать» без причины.
- Политика по Sonar/React Compiler зафиксирована в `eslint.config.mjs` (см. комментарий в начале файла).
- Целевые quality-пороги: Sonar-плотность `<= 6/1000 LoC`; cognitive-complexity: **10** (`lib/**`, `app/api/**`), **15** (UI: `features/**`, `components/**`, `contexts/**`, `hooks/**`, `app/**/*.tsx`) — см. `eslint.config.mjs` (`sonarjs/core-complexity`, `sonarjs/ui-complexity`). **`scripts/**`**: complexity **25**, часть Sonar-правил смягчена (CLI).
- `sonarjs/no-nested-conditional`, `no-nested-functions`, `no-nested-template-literals` — **warn**, не error (ветвистый UI не дробить ради стиля).
- Архитектурное правило UI: **один компонент = один файл** (допускаются только точечные исключения с комментарием причины).
- Размер файлов ограничивать и снижать поэтапно (см. `docs/REFACTORING_WAVES_PLAN.md`, трек `max-lines`).

## Рефакторинг, `*Helpers*` и размер модулей

После волны split-монолитов (~400+ `*Helpers*`) действует **консолидация**, а не бесконечное дробление.

### Когда выносить код в отдельный файл

Новый `*Helpers.ts` / `*Helpers.tsx` — только если выполняется **хотя бы одно**:

| Критерий | Порог |
|----------|--------|
| Осмысленная логика (без пустых строк и re-export) | **~40–60+ строк** |
| Потребители | **2+** модуля |
| Тесты | unit-тесты на чистые функции |
| Слой | стабильный домен (`lib/`, `app/api/`) или переиспользуемый UI-блок |

**Не создавать** отдельный файл ради снижения cognitive-complexity на 1–2 пункта (порог UI уже **15**).

### Антипаттерны (не повторять)

- **Barrel из одной строки** — `export { foo } from './fooHelpers'` в отдельном файле; импортировать **напрямую** из модуля с реализацией.
- **Extract без wire-up** — helper рядом с route/component, но родитель по-прежнему с inline-логикой → Knip «unused file», ESLint «unused var». Сначала **подключить**, потом коммит.
- **Big bang** — сотни файлов одним коммитом; лучше **волнами по домену** (`admin/`, `sprint/occupancy/`, `app/api/auth/`).
- **Дробление ради lint** — цепочки `Foo.tsx` → `fooHelpers.ts` → `fooLayoutHelpers.ts` при complexity 6–8.

### Когда вливать helper обратно

Приоритет на слияние (merge → caller), если **все** условия:

- helper **≤ ~25 строк** и **один** импортёр;
- после merge родитель **< 500 строк** (`max-lines`);
- нет отдельных unit-тестов на helper (или тесты переносятся в тест родителя / соседний модуль).

**Оставлять** helper, если 2+ потребителя, есть тесты, или это `lib/` / API с чистой логикой.

### Extract on touch

- Трогаешь монолит **> 500 строк** — можно резать по зонам ответственности **в том же PR**, с wire-up и `pnpm lint:unused`.
- Трогаешь мелкий helper с одним caller — **влить в caller**, не плодить соседний файл.
- Не откатывать всю волну split одним коммитом; чистить **постепенно** (barrel'ы → merge ≤15 строк → review 16–25).

### Knip и мёртвый код

1. **`pnpm lint:unused`** — источник правды по unused files/exports.
2. Unused **file** → сначала проверить, не забыли ли import в route/parent; если дубликат — удалить; если нужен — **wire-up**.
3. Unused **export** → `node scripts/knip/unexport-unused.mjs` (снять `export`) или удалить символ.
4. **Не** удалять код из `lib/organizations`, API routes и т.п. только потому, что Knip не видит caller — часто это незавершённый wire-up.

### Порядок консолидации (ориентир)

1. Однострочные re-export barrel'ы (удалить, поправить import).
2. Helpers **≤ 15 строк**, 1 caller (~27 файлов в аудите) — merge.
3. Re-export строка внутри «живого» helper-файла — импорт напрямую из источника.
4. Helpers **16–25 строк**, 1 caller — по папкам (`occupancy/`, `admin/teams/`).
5. **`lib/`**, **`app/api/`** с тестами — консервативно, только явный выигрыш в читаемости.

### Связь с ESLint и pre-commit

- Pre-commit (`lint-staged`) гоняет ESLint только на **staged** файлы; перед push — полный **`pnpm lint`** + **`pnpm lint:unused`**.
- Cognitive-complexity **16+** в UI или **11+** в core — повод на **настоящий** extract (крупный кусок), не на файл из 10 строк.

## Pre-commit (Husky + lint-staged)

После **`pnpm install`** активируется хук: при коммите на **проиндексированных** `*.{js,jsx,mjs,cjs,ts,tsx}` запускается **`eslint --fix`**.

- Обойти хук (только при необходимости): `git commit --no-verify` или `HUSKY=0 git commit …`.
- Полный проект по-прежнему не линтится в хуке — только изменённые файлы; перед пушем прогонять **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm test`** и **`pnpm lint:unused`**.

## CI

В GitHub Actions workflow **CI** (`.github/workflows/ci.yml`) на `push`/`pull_request` в основную ветку запускаются `pnpm lint`, `pnpm typecheck` и `pnpm test`. Сборка Docker-образа не запускает ESLint (`NEXT_IGNORE_ESLINT` в Dockerfile), поэтому локальные и CI-проверки обязательны.
