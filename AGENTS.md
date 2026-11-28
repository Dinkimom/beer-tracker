# Подсказки для ассистентов и разработчиков

## Раскладка спринта

Раскладка спринта — свимлейн (`features/swimlane/`, `features/task/components/TaskBar/`) и канбан. Старый планер «Занятость» (occupancy) удалён; имена `occupancy*` в живом коде (`occupancyValidation`, `lib/planner-timeline/occupancyUtils.ts`, `occupancy_task_order`) — исторические.

## Перед тем как считать задачу сделанной

1. **`pnpm typecheck`** — без ошибок TypeScript.
2. **`pnpm lint`** — строго без ошибок и предупреждений ESLint (`--max-warnings 0`).
3. **`pnpm test`** — unit-тесты (Vitest); при изменении покрытой логики — добавить или обновить тесты.
4. **`pnpm lint:unused`** — без находок Knip (мертвый код/неиспользуемые зависимости/экспорты).
5. **`pnpm lint:dup`** — без новых копий кода сверх `.jscpd-baseline.json`. Убрал дубли — `pnpm lint:dup:baseline` и закоммитить baseline.
6. **`pnpm lint:shape`** — форма кода не хуже `.shape-baseline.json`: нет новых широких `*Props`, слоёв-пробросов и хуков-дирижёров, старые не выросли ([«Форма кода»](#форма-кода)). Стало лучше — `pnpm lint:shape:baseline` и закоммитить baseline.
7. При изменении зависимостей или публичных API — при необходимости **`pnpm build`**.
8. **Регресс**, если меняется видимое пользователю поведение или вид: `pnpm e2e:affected` → обновить кейсы в [`docs/TEST_CASES.md`](./docs/TEST_CASES.md) → написать или поправить автотесты в `e2e/` → **`pnpm e2e`**, **`pnpm e2e:visual`** и **`pnpm e2e:audit`** (Docker), каждое падение разобрать. Правка трогает API-роуты, базу, провайдер трекера, синк, вход или админку — ещё **`pnpm e2e:stand`** (Docker). Весь цикл — скилл `regress`, правила — [`docs/AGENT_TESTING_GUIDE.md`](./docs/AGENT_TESTING_GUIDE.md#постоянный-процесс-фича--кейсы--тесты).

Эти шаги обязательны для ассистентов-агентов перед завершением задачи: если какой-то этап не удалось запустить локально, явно зафиксировать это в ответе и указать причину.
Предупреждения по качеству считаются блокирующими и должны устраняться как ошибки.

## Демо планера

UI планера можно проверять на **`/demo/planner`**, без логина в трекер если не затрагивается логика связанная с трекером или данными трекера. Страница всегда на фикстурах (`lib/demo/`), переменные `DEMO_*` не нужны; `/demo/planner?fixture=stress` — те же экраны на неудобных данных (длинные названия, много людей, задачи без оценок). Там те же вкладки, что у боевого планера: свимлейн, бэклог, диаграмма сгорания, ретро. Часы планера зафиксированы.

`useCurrentUser` на этой странице не ходит в Tracker (`DemoPlannerShellProvider`). Имя и аватар текущего пользователя там пустые; люди на доске — персонажи фикстуры.

Локально это тот же dev-сервер, что уже запущен, плюс путь `/demo/planner` (у `pnpm docker:dev` обычно `http://localhost:3000/demo/planner`).

Та же страница публикуется статикой на GitHub Pages при каждом релизе (тег): https://dinkimom.github.io/beer-tracker/demo/planner/ — `pnpm demo:pages` (только в CI или одноразовом worktree с `--force`: скрипт удаляет серверные маршруты), workflow `demo-pages.yml`. Сервера там нет: всё, что демо берёт из `public/`, — через `publicAssetPath` (`lib/staticDemoBuild.ts`), иначе путь сломается под подпутём `/beer-tracker`.

На этой же странице идёт автоматический регресс (`e2e/`, Playwright). Новое поведение, которое на фикстурах не воспроизвести, сначала получает данные в `lib/demo/`.

## Встроенный трекер otorva

Собственный трекер на Rust — отдельный проект [`rusticapps/otorva`](https://github.com/rusticapps/otorva) (приватный репозиторий; ntex + diesel + PostgreSQL, свои `AGENTS.md`, `README.md`, `SPECS.md`). Для beer-tracker это зависимость: готовые образы `alfacrab/otorva` (API) и `alfacrab/otorva-migrate` (мигратор) из Docker Hub, их публикует CI otorva. Доски, спринты, ключи задач, оценки, фильтры и журнал изменений развиваются там, провайдер в beer-tracker остаётся тонким; здесь — только обвязка (провайдер, compose, стенд). План интеграции и что уже сделано — `docs/OTORVA_INTEGRATION.md`.

- Версия — `OTORVA_IMAGE` / `OTORVA_MIGRATE_IMAGE` (по умолчанию `latest`); клон otorva для запуска не нужен.
- **Выключен по умолчанию.** Включает одна переменная `OTORVA_ENABLED=1` в `.env`: compose поднимает `otorva-migrate` и `otorva` (`deploy.replicas`, поэтому именно `1`, не `true`), а онбординг и админка предлагают «Встроенный трекер»; без неё вариант скрыт, вход отклоняется (`disabled`). С ней `pnpm docker:dev` поднимает otorva вместе с приложением — своя база `otorva` на общем PostgreSQL (создаёт мигратор), API на `http://127.0.0.1:8090` (в сети compose — `http://otorva:8080`). Стенд включает его сам.
- Правка нужна в самом трекере — PR в `rusticapps/otorva` по его `AGENTS.md`; после мержа CI otorva публикует `latest`, дальше `pnpm e2e:stand` (скачивает свежий образ) или `docker compose … pull otorva otorva-migrate` для `pnpm docker:dev`.
- Провайдер в планере: `lib/issueTrackerProvider/otorva*.ts` (вид `otorva`), вход по email и паролю — `POST /api/auth/otorva/session` (`lib/auth/otorvaCredentials.ts`); веб-интерфейса нет — `supportsIssueWebLinks: false`, ключи задач текстом. Проверка UI без ссылок — `/demo/planner?tracker=otorva`.

## Команды

| Команда | Назначение |
|---------|------------|
| `pnpm lint` | ESLint по проекту |
| `pnpm lint:fix` | ESLint с автоисправлением |
| `pnpm lint:sonar-density` | Плотность SonarJS-срабатываний / 1000 LoC (цель ≤ 6) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (`vitest run`), затем **`pnpm check:i18n`** (паритет ключей ru/en) и **`pnpm check:e2e-cases`** |
| `pnpm check:i18n` | Паритет ключей ru/en + проверка английских листьев (пустые строки, TODO/TBD/FIXME); исключения — `scripts/i18n/english-quality-allowlist.json` |
| `pnpm i18n:export` | Экспорт `en`/`ru` в плоский JSON для офлайн-перевода (см. `scripts/i18n/README.md`) |
| `pnpm i18n:import` | Слияние правок из JSON обратно в `en.ts` / `ru.ts` |
| `pnpm test:watch` | Vitest в режиме watch |
| `pnpm e2e` | Функциональные e2e (Playwright) на `/demo/planner` против запущенного dev-сервера |
| `pnpm e2e:visual` | Визуальный регресс в Linux-образе Playwright (Docker); `pnpm e2e:visual:update` — переснять эталоны |
| `pnpm e2e:audit` | Аудит интерфейса (axe, обрезка текста, перекрытия, правила кнопок, непереведённые строки) в Docker на en, ru и ru + стресс-данных; `pnpm e2e:audit:update` — переписать список известных проблем |
| `pnpm e2e:stand` | Стенд регресса на встроенном трекере: пустые база и otorva в Docker, планер на `:3100`, онбординг → сид из фикстур демо → сценарии с записью в трекер (`e2e/stand/`); см. [`docs/AGENT_TESTING_GUIDE.md`](./docs/AGENT_TESTING_GUIDE.md#стенд-регресса-встроенный-трекер) |
| `pnpm e2e:tour` | Кадры состояний демо (меню, окна, пустые результаты) и находки детекторов для разбора глазами — скилл `ui-audit`; `E2E_LANG=ru`, `E2E_FIXTURE=stress` |
| `pnpm e2e:affected` | Кейсы `docs/TEST_CASES.md`, задетые текущим diff, и UI-файлы без кейса |
| `pnpm check:e2e-cases` | Сверка каталога кейсов с кодом и спеками (входит в `pnpm test`) |
| `pnpm e2e:report` | HTML-отчёт последнего e2e-прогона |
| `pnpm sync-worker` | BullMQ-воркер синхронизации (отдельный процесс) |
| `pnpm sync-worker:build` | Бандл воркера в `dist/sync-worker` (Docker target `sync-worker`) |
| `pnpm lint:unused` | Knip: неиспользуемые файлы/зависимости |
| `pnpm lint:dup` | jscpd: новые копии кода сверх `.jscpd-baseline.json` (конфиг `.jscpd.json`). Убрал дубли — `pnpm lint:dup:baseline` и закоммитить baseline |
| `pnpm lint:shape` | Храповик формы кода: ширина `*Props`, проброс пропсов, вход и выход хуков против `.shape-baseline.json`; `pnpm lint:shape:baseline` — переснять после упрощения |
| `pnpm quality:report` | Горячие точки: нарушения формы × правки за 30 дней — кандидаты в `docs/REFACTORING_BACKLOG.md` |
| `pnpm build` | Production-сборка Next.js |
| `pnpm storybook` | Витрина UI (Storybook, порт 6006) |
| `pnpm build-storybook` | Статическая сборка Storybook в `storybook-static/` (каталог в `.gitignore`) |

Локализация UI (ключи, словари, когда гонять `check:i18n`): **[`scripts/i18n/README.md`](./scripts/i18n/README.md)**.

## Дизайн-система и общие компоненты

- Перед добавлением нового атома UI: поиск в [`components/`](./components/) и в [аудите дублей](./docs/SHARED_COMPONENTS_AUDIT.md); по возможности расширять существующий примитив.
- Семантические CSS-токены (бордеры шапки, muted-текст, тосты): [`app/globals.css`](./app/globals.css) (`--ds-*`, `--toast-*`).
- Сториз — для общих примитивов (`components/*.stories.tsx`, запуск `pnpm storybook`): новый или изменённый примитив в `components/` получает или обновляет историю в том же коммите — все его состояния (длинное содержимое, ошибка, disabled, варианты). Сторибук — место промежуточной отладки состояний; экраны и окна фич в него не выносить (завязаны на сторы и данные трекера), их финальная проверка — в приложении на `/demo/planner`.
- Модальное окно — только через [`components/Modal.tsx`](./components/Modal.tsx); подтверждение действия — `useConfirmDialog`. Свою оболочку с `fixed inset-0` не заводить. Меню или панель у точки клика либо у элемента без триггера — [`components/AnchoredPopover.tsx`](./components/AnchoredPopover.tsx).
- Кнопка интерактивна. У `button` и контрола с `role="button"` обязательны: `cursor-pointer`; видимый hover (фон или цвет); отклик нажатия (`active:`, фон и обычно `active:scale-[0.98]`); плавный отпуск через `transition` — `transition-colors`, если меняется только цвет, и `transition-all duration-200`, если есть масштаб. Образец — [`components/HeaderIconButton.tsx`](./components/HeaderIconButton.tsx). Disabled не выглядит кликабельным: `disabled:pointer-events-none` или `disabled:cursor-not-allowed` и без hover. Кольцо фокуса с клавиатуры — общее (`:focus-visible` в `app/globals.css`, токен `--ds-focus-ring`): свои `focus:ring-*` / `focus-visible:ring-*` не добавлять, они не рисуются.

## Архитектура данных (кратко)

Полная карта: **[ARCHITECTURE.md](./ARCHITECTURE.md)** — React Query (задачи спринта, доски), MobX (позиции, UI планера), списки с отложенной записью — `SyncedList` в модели доски (связи, заметки), паттерн «локальный список задач в планере + оптимистичные правки».

**Клиент:** UI ходит в `/api/*` только через [`lib/api/*`](./lib/api/) (`getPlannerBeerTrackerApi`); DTO ответов — в `lib/api/types` / `lib/<domain>`, не в `app/api/**/route.ts`. Бэклог выравнивания: [`docs/ARCHITECTURE_UNIFORMITY.md`](./docs/ARCHITECTURE_UNIFORMITY.md).

## API routes и доступ к БД

**`app/api/**/route.ts` — тонкий HTTP-слой.** Роут: tenant/auth, parse/validate body, status codes, `NextResponse`, инвалидация кэша. **Не пишет SQL** и не импортирует `query` / `pool` из `@/lib/db`.

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Route | `app/api/**/route.ts` | HTTP, Zod, auth, кэш API |
| Route helpers / services | `lib/<domain>/*` | оркестрация без SQL (`*RouteHelpers`, admin sync/teams и т.п.) |
| Repository / service | `lib/<domain>/*Repository.ts` | SQL, транзакции, маппинг строк |
| Client | `lib/api/*` | axios → `beerTrackerApi`; UI без raw `fetch('/api/...')` |

**Новый код:** SQL и оркестрация HTTP-роутов — только в `lib/<domain>/`, не рядом с `route.ts`. Образцы: [`lib/sprints/`](./lib/sprints/), [`lib/admin/`](./lib/admin/), [`lib/issues/`](./lib/issues/), [`lib/sprintGoals/`](./lib/sprintGoals/), [`lib/organizations/`](./lib/organizations/), [`lib/staffTeams/`](./lib/staffTeams/).

**Легаси:** при касании route с inline SQL — вынести в repository в том же PR.

**ESLint:** `app/api/**` — запрет `query`/`pool`/`runBeerTrackerTransaction`/`qualifyBeerTrackerTables` из `@/lib/db` (`api/no-direct-db`). UI/`lib` — запрет импортов из `@/app/api/**` и `beerTrackerApi` из `@/lib/axios` (`layers/no-app-api-import`).

**Исключения:** транзакции целиком в repository; route не вызывает `pool.connect()`.

**Доступ:** `/api/*` без сессии закрыт в [`proxy.ts`](./proxy.ts). Роут, который должен работать без входа (вход, OAuth, cron по секрету), добавлять в [`lib/auth/apiAccessGate.ts`](./lib/auth/apiAccessGate.ts) и проверять доступ в нём самом. Права в организации — в роуте: `requireTenantContext` / `requireSprintRouteContext` / `requireOrgAdminForOrganizationRoute`.

**Схема БД — только миграции.** Новая таблица, колонка, индекс или CHECK — новый файл `database/migrations/NNNN_*.sql` (правила — [`docs/DATABASE.md`](./docs/DATABASE.md#как-добавить-миграцию)). Runtime-DDL (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` в репозиториях, флаги `schemaEnsured`) не добавлять. Применённую миграцию не править.

## Слои: MobX, dnd-kit, `lib/`

- **Модель доски `SprintBoard` (`features/sprint/model/`)** — единственный источник данных доски спринта: задачи (ссылка на кэш Query, правка — `board.updateTasks`), позиции (`board.positions`), связи и заметки (`SyncedList`), действия — доменные классы `board.plan`, `board.notes`. Лист читает её сам (`useSprintBoard()`, какая это карточка — `SwimlaneCardContext`), промежуточные слои данные доски не передают. Новое правило доски — метод или `computed` доменного класса с тестом, не `use*`-хук и не обработчик. Пошагово — [рецепт в ARCHITECTURE.md](./ARCHITECTURE.md#модель-доски-и-классы-под-вью-направление-с-2026-11).
- **`observer` обязателен.** Компонент, читающий модель или MobX-стор, обёрнут в `observer` (`export const X = observer(function X(…) {…})`), иначе молча показывает устаревшее. Прямой вызов `useSprintBoard` / `useRootStore` / `useQuarterlyPlanBoard` проверяет ESLint `mobx/observer-reads-store`.
- **MobX (`lib/layers/application/mobx/`, сторы в `lib/layers/application/mobx/stores/`, корневой `createRootStore` рядом)** — сторы приложения: позиции задач (`TaskPositionsStore`, на доске — через `board.positions`), UI-сессия планера, согласование с API (поколения ответов, оптимистичные правки), движок списков `SyncedList`. Не класть сюда жизненный цикл одного жеста drag, если он полностью задаётся dnd-kit.
- **`SprintPlannerUiStore`** — преходящий UI основного планера спринта, разложенный по классам под вью: `cards` (наведение, перетаскивание, ресайз, превью раскладки), `overlays` (сайдбар, контекстное меню, панель задачи, учёт работ), `tools` (инструмент капсулы, окна заметки/схемы/фото, режимы связи и отрезков), `agentChat`, `focus` (поиск по имени, подсветка). Сам стор только держит классы и сбрасывает их при смене спринта (`clearTransientUiOnSprintChange`). Читать — через область: `useRootStore().sprintPlannerUi.cards.hoveredTaskId`; новое поле — в класс своей области, а не в стор. Хелперу, которому нужна одна область, передавать её (`sprintPlannerUi.cards`), а не стор целиком.
- **dnd-kit + React** — перетаскивание в UI: `active` / `over`, сброс в `onDragEnd` / `onDragCancel` / `onDragAbort`. Общие правила маршрутизации для планера спринта — `features/sprint/components/SprintPlanner/sprintPlannerDndHelpers.ts` (не дублировать логику между shell и хуками).
- **`lib/` (геометрия, парсеры, чистые функции)** — без зависимостей от MobX и React; тестируемые unit-тестами без рендера.

## Конвенции

- Следовать существующим паттернам в соседних файлах (именование, импорты, стиль компонентов).
- Не добавлять лишние зависимости без необходимости; неиспользуемый код удалять, а не «заглушать» без причины.
- Политика по Sonar/React Hooks зафиксирована в `eslint.config.mjs` (см. комментарий в начале файла).
- Целевые quality-пороги: Sonar-плотность `<= 6/1000 LoC` (`pnpm lint:sonar-density`); cognitive-complexity: **10** (`lib/**`, `app/api/**`), **15** (UI: `features/**`, `components/**`, `contexts/**`, `hooks/**`, `app/**/*.tsx`) — см. `eslint.config.mjs` (`sonarjs/core-complexity`, `sonarjs/ui-complexity`). **`scripts/**`**: complexity **25**, часть Sonar-правил смягчена (CLI).
- `sonarjs/no-nested-conditional`, `no-nested-functions`, `no-nested-template-literals` — **error** в `lib/**` и `app/api/**`; **off** в UI (ветвистый JSX не дробить ради стиля).
- `react-hooks/exhaustive-deps` — **error** (явно строже recommended warn).
- Архитектурное правило UI: **один компонент = один файл** (допускаются только точечные исключения с комментарием причины).
- Размер файлов ограничивать и снижать поэтапно (`max-lines: 500` в `eslint.config.mjs`, бэклог — [`docs/REFACTORING_BACKLOG.md`](./docs/REFACTORING_BACKLOG.md)).
- Проблему продукта, замеченную по дороге и не починенную в текущей задаче (разнобой в интерфейсе, зашитый текст, лишний шаг, мелкий баг), записывать в [`docs/CLEANUP_BACKLOG.md`](./docs/CLEANUP_BACKLOG.md); починил — удалить строку в том же коммите.

## Рефакторинг, `*Helpers*` и размер модулей

**Эпоха дробления завершена (2026-10-29).** Волну split-монолитов (~400+ `*Helpers*`, файлы ради lint, копии под каждый вид) свели обратно: копипаст 1,74% → 1,36% (`pnpm lint:dup`, новые клоны ломают CI), мелкие хелперы с одним потребителем и однострочные реэкспорты влиты в код. Файлы до 15 строк, что остались, — тонкие роуты, страницы Next, типы, константы, компоненты (один компонент — один файл), общие утилиты с 2+ потребителями и модули-швы для `vi.mock` в тестах.

Дальше действует обычный режим: новый файл — по правилам ниже, слияние — по касанию. Отдельных волн консолидации больше не нужно.

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
- **Big bang** — сотни файлов одним коммитом; лучше **волнами по домену** (`admin/`, `features/swimlane/`, `app/api/auth/`).
- **Дробление ради lint** — цепочки `Foo.tsx` → `fooHelpers.ts` → `fooLayoutHelpers.ts` при complexity 6–8.
- **Копия под новый тип** — новый вариант существующего механизма (ещё один вид черновика, карточки, заметки) делается параметром и записью в таблице поведения, а не копией файлов/хуков под этот вид. Копировать можно только то, что реально ведёт себя иначе.
- **Второе правило вместо импорта** — бизнес-правило (раскладка, поинты, «сделано», виды карточек) реализуется один раз; см. [`docs/BUSINESS_RULES.md`](./docs/BUSINESS_RULES.md). Нужно в другом месте — импортировать, не переписывать.

### Форма кода

Данные доски — в доменной модели и классах под вью (MobX), не в цепочках хуков и пропсов: [ARCHITECTURE.md, «Модель доски и классы под вью»](./ARCHITECTURE.md#модель-доски-и-классы-под-вью-направление-с-2026-11). Режем по доменам, а не ради порогов: новый `use*`-хук — только React-специфика, доменное правило — метод или computed модели.

Доску дорого менять не из-за длины файлов, а из-за широких интерфейсов: новая возможность карточки протаскивается через 3–5 слоёв, которые сами ничего не делают. Храповик `pnpm lint:shape` (`scripts/shape/`) меряет ширину интерфейсов, а не длину кода (длину файла держит ESLint `max-lines`, 500); сегодняшний долг заморожен в `.shape-baseline.json` и может только уменьшаться, новые нарушения и рост старых валят CI.

| Метрика | Порог | Что делать вместо |
|---------|-------|-------------------|
| Собственных полей в `*Props` | **20** | Связанные поля — одним объектом-срезом (`interaction`, `quickAdd`, `dnd`); преходящий UI — из стора (`useRootStore().sprintPlannerUi`) или контекста, а не пропсом |
| Доля атрибутов, передающих полученный пропс как есть (`x={x}`, `y={props.x}`, `z={handlers.z}`; от 20 атрибутов) | **50%** | Слой, который в основном передаёт дальше, — влить в родителя или ребёнка; ребёнок берёт срез или читает стор сам |
| Полей на входе хука (деструктурированный объект или позиционные параметры) | **15** | Хук-дирижёр собирает всё со всей доски: брать срез (`handlers`, `quickAdd`) или читать стор, а не принимать по полю |
| Полей в объекте, который хук возвращает | **20** | Не отдавать «всё» для `{...viewModel}` в компонент: группировать в срезы по потребителю или резать хук по зонам (данные / действия / раскладка) |

- Тронул файл из baseline — его метрика не растёт. Добавить пропс в широкий интерфейс можно, только убрав или сгруппировав другой.
- Переименовал или перенёс файл из baseline — запись переснимается (`pnpm lint:shape:baseline`); в diff baseline видно, что долг не вырос.
- **Раз в спринт** — `pnpm quality:report`: нарушения × правки за 30 дней. Верх списка — кандидаты в [`docs/REFACTORING_BACKLOG.md`](./docs/REFACTORING_BACKLOG.md); один пункт в спринт, результат — меньше записей в baseline.

### Размер изменений

- Один коммит — одна фича или один фикс, ориентир — несколько сотен строк, а не десятки файлов. Большую работу агент режет на шаги и показывает diff каждого.
- В коммит не идёт код, который автор (человек) не прочитал и не может объяснить.

### Когда вливать helper обратно

Приоритет на слияние (merge → caller), если **все** условия:

- helper **≤ ~25 строк** и **один** импортёр;
- после merge родитель **< 500 строк** (`max-lines`);
- нет отдельных unit-тестов на helper (или тесты переносятся в тест родителя / соседний модуль).

**Оставлять** helper, если 2+ потребителя, есть тесты, или это `lib/` / API с чистой логикой.

### Extract on touch

- Трогаешь монолит **> 500 строк** — можно резать по зонам ответственности **в том же PR**, с wire-up и `pnpm lint:unused`.
- Трогаешь мелкий helper с одним caller — **влить в caller**, не плодить соседний файл.

### Knip и мёртвый код

1. **`pnpm lint:unused`** — источник правды по unused files/exports.
2. Unused **file** → сначала проверить, не забыли ли import в route/parent; если дубликат — удалить; если нужен — **wire-up**.
3. Unused **export** → `node scripts/knip/unexport-unused.mjs` (снять `export`) или удалить символ.
4. **Не** удалять код из `lib/organizations`, API routes и т.п. только потому, что Knip не видит caller — часто это незавершённый wire-up.

### Связь с ESLint и pre-commit

- Pre-commit (`lint-staged`) гоняет ESLint только на **staged** файлы; перед push — полный **`pnpm lint`** + **`pnpm lint:unused`**.
- Cognitive-complexity **16+** в UI или **11+** в core — повод на **настоящий** extract (крупный кусок), не на файл из 10 строк.

## Pre-commit (Husky + lint-staged)

После **`pnpm install`** активируется хук: при коммите на **проиндексированных** `*.{js,jsx,mjs,cjs,ts,tsx}` запускается **`eslint --fix`**.

- Обойти хук (только при необходимости): `git commit --no-verify` или `HUSKY=0 git commit …`.
- Полный проект по-прежнему не линтится в хуке — только изменённые файлы; перед пушем прогонять **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm test`**, **`pnpm lint:unused`**, **`pnpm lint:dup`** и **`pnpm lint:shape`**.

## CI

В GitHub Actions workflow **CI** (`.github/workflows/ci.yml`) на `push`/`pull_request` в основную ветку запускаются `pnpm lint`, `pnpm lint:dup`, `pnpm lint:shape`, `pnpm typecheck` и `pnpm test`, отдельным job `e2e` — функциональные и визуальные спеки Playwright в его Linux-образе, job `e2e-stand` — стенд регресса на встроенном трекере (образы otorva из Docker Hub). Сборка Docker-образа не запускает ESLint (`NEXT_IGNORE_ESLINT` в Dockerfile), поэтому локальные и CI-проверки обязательны.
