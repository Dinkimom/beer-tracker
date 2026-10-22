<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/logo-button-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/logo-button-light.png" />
    <img src="./docs/media/logo-button-light.png" alt="Beer Tracker" height="44" />
  </picture>
</h1>

<p align="center">
  <strong>Русский</strong> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <strong>Планер спринтов поверх Яндекс Трекера и Jira</strong><br />
  Свимлейны по людям и дням, бэклог, цели, burndown — задачи остаются в вашем трекере.
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" /></a>
  <a href="https://hub.docker.com/r/dinkimom/beer-tracker"><img alt="Docker Hub" src="https://img.shields.io/badge/docker-dinkimom%2Fbeer--tracker-2496ED?logo=docker&logoColor=white" /></a>
  <a href="./CHANGELOG.md"><img alt="Version" src="https://img.shields.io/badge/version-1.23.0-informational" /></a>
</p>

<p align="center">
  <a href="#планер">Планер</a> ·
  <a href="#бэклог">Бэклог</a> ·
  <a href="#факт">Факт</a> ·
  <a href="#ретро">Ретро</a> ·
  <a href="#совместная-работа">Совместная работа</a> ·
  <a href="#где-используется">Где используется</a> ·
  <a href="#быстрый-старт">Старт</a> ·
  <a href="#mcp-для-агентов">MCP</a>
</p>

## Планер

Длина сетки — рабочие дни между началом и концом спринта в трекере. День делится на 2, 3 или 4 таймслота, по умолчанию на три. Отдельная дорожка на разработчика и тестировщика.

Карточки задач тянутся мышкой, длительность меняется resize’ом. На тех же дорожках видны отпуска и техспринты. Можно оставлять заметки по ходу спринта, чтобы ничего не забыть: в них видны ссылки, чеклисты и реакции. Справа — задачи этого спринта.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/swimlane-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/swimlane-light.png" />
    <img src="./docs/media/swimlane-light.png" alt="Планер спринта: свимлейны" width="900" />
  </picture>
</p>

## Бэклог

Отбор задач вне спринта, фильтры по статусу и людям, перенос в активный спринт.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/backlog-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/backlog-light.png" />
    <img src="./docs/media/backlog-light.png" alt="Бэклог" width="900" />
  </picture>
</p>

## Burndown

Story Points и Test Points по дням спринта, идеальная линия и маркер «сегодня».

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/burndown-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/burndown-light.png" />
    <img src="./docs/media/burndown-light.png" alt="Burndown SP/TP" width="900" />
  </picture>
</p>

## Факт

Sync забирает из трекера историю статусов. На свимлейне это **таймлайн факта**: когда задача была в работе, на ревью и в тесте — рядом с планом, а не вместо него.

Выгрузку запускают в `/admin/sync`. Плановый incremental sync — Redis и `pnpm sync-worker`; полный rescan можно гнать inline. Подробности — [INSTALL.md](./docs/INSTALL.md).

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/fact-timeline-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/fact-timeline-light.png" />
    <img src="./docs/media/fact-timeline-light.png" alt="Таймлайн факта на свимлейне" width="900" />
  </picture>
</p>

## Ретро

Колонки, заметки, картинки, комментарии и реакции. Сбоку блок **«Факты»**: что закрыли, добавили, сняли и перенесли, cycle time и узкие места по changelog. Договорённости из ретро переносятся в следующий спринт.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/retro-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/retro-light.png" />
    <img src="./docs/media/retro-light.png" alt="Доска ретроспринта" width="900" />
  </picture>
</p>

## Совместная работа

На одном спринте видно, кто сейчас на доске: аватары в шапке и на карточках, действие (смотрит, двигает, редактирует, меняет продолжительность). Чужой жест блокирует карточку. Правки позиций, задач, связей, комментариев и ретро приходят без обновления страницы. Есть общий таймер спринта.

Для нескольких инстансов нужен Redis. Без него realtime живёт в памяти одного процесса.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/collaboration-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/collaboration-light.png" />
    <img src="./docs/media/collaboration-light.png" alt="Совместная работа: presence на доске" width="900" />
  </picture>
</p>

## Где используется

Компании, которые ведут спринты в Beer Tracker.

<!-- adopters: тот же порядок, что в docs/companies.md. Пара файлов docs/media/companies/<id>-light.svg и <id>-dark.svg. -->
<p align="center">
  <a href="https://www.yclients.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./docs/media/companies/yclients-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="./docs/media/companies/yclients-light.svg" />
      <img src="./docs/media/companies/yclients-light.svg" alt="YCLIENTS" height="40" />
    </picture>
  </a>
</p>

## Быстрый старт

```bash
cp env.example .env
# POSTGRES_PASSWORD, AUTH_SESSION_SECRET (≥32), ORG_SECRETS_ENCRYPTION_KEY (64 hex)
docker compose -f docker-compose.yml -f docker-compose.hub.yml up -d
```

Откройте [http://localhost:3000](http://localhost:3000) и подключите трекер. Опубликованные образы — [`dinkimom/beer-tracker`](https://hub.docker.com/r/dinkimom/beer-tracker), тег `1.23.0`.

Установка, S3, sync и разработка из исходников — [docs/INSTALL.md](./docs/INSTALL.md). Провайдер на организацию — [docs/ISSUE_TRACKERS.md](./docs/ISSUE_TRACKERS.md).

## MCP для агентов

Remote MCP крутится на вашем инстансе. Клиент (Cursor, Claude Desktop / Code) открывает браузер, логин и consent, затем получает Bearer. Scope: `mcp:tools`. Подробности — [SPRINT_CONTEXT.md](./docs/SPRINT_CONTEXT.md).

Агент читает план и предлагает правки. Запись в спринт идёт только после confirm.

- Найти спринт (`search_sprints`) и снять planning graph: позиции, capacity, цели, заметки, связи (`get_sprint_context`, `get_sprint_capacity`)
- Найти задачи и людей (`search_issues`, `resolve_person`), открыть issue и snapshot
- Предложить правки (`propose_plan_patch`) и применить их (`apply_plan_patch`)
- Читать и править доску ретро (`get_retro_board`, `apply_retro_board`)

| Кейс | Как это выглядит |
|------|------------------|
| «Какие риски в спринте Demo 2615?» | Спринт → capacity и overlaps → короткий разбор перегруза |
| Запланируй DEMO-101 на Алису | Propose позиций и заметок → человек смотрит preview → apply |
| «Подготовь ретро по Demo 2614» | Сводка фактов и черновик карточек на доске |

```json
{
  "mcpServers": {
    "beer-tracker-planning": {
      "url": "https://<your-bt-host>/api/mcp"
    }
  }
}
```

## Документация

| Документ | О чём |
|----------|--------|
| [Установка](./docs/INSTALL.md) | Docker, dev, env, sync |
| [Issue trackers](./docs/ISSUE_TRACKERS.md) | Яндекс Трекер и Jira |
| [Возможности](./docs/CAPABILITIES.md) | Полный список функций |
| [Обзор](./docs/PROJECT_OVERVIEW.md) | Для кого продукт и какие экраны |
| [Sprint context / MCP](./docs/SPRINT_CONTEXT.md) | Planning graph и ретро для агентов |
| [Индекс](./docs/DOCUMENTATION_INDEX.md) | Вся документация |

## Контрибьюция

Коммиты с [DCO](https://developercertificate.org/) (`git commit -s`) — [CONTRIBUTING.md](./CONTRIBUTING.md). Уязвимости — [SECURITY.md](./SECURITY.md).

Историческое имя UI — Sprint Manager. Стек и слои — [ARCHITECTURE.md](./ARCHITECTURE.md). Слоты скринов — [docs/media/README.md](./docs/media/README.md). Ещё одна компания на посадочной — [docs/companies.md](./docs/companies.md).

Планировщик эпиков и квартальный план сняты с навигации и не развиваются: [product steering](./docs/steering/product.md).

## Лицензия

[Apache License 2.0](./LICENSE). Атрибуция — [NOTICE](./NOTICE).
