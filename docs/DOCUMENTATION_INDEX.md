# Индекс документации Beer Tracker

Быстрый справочник по всей документации проекта.

## 📋 Структура документации

```
beer-tracker/
├── README.md                          # Быстрый старт, установка, настройка
├── docs/
│   ├── DOCUMENTATION_INDEX.md         # Этот индекс
│   ├── PROJECT_OVERVIEW.md            # Единый обзор: что / для кого / функции / стек
│   ├── CAPABILITIES.md                # Список возможностей планера
│   ├── API_DOCUMENTATION.md           # API, архитектура запросов
│   ├── API_BACKENDS.md                # Маршруты /api → Tracker, PG
│   ├── SPRINT_CONTEXT.md              # Agent planning graph (GET sprint-context)
│   ├── ISSUE_TRACKERS.md              # Yandex Tracker и Jira (один провайдер на инстанс)
│   ├── ISSUE_TRACKER_PROVIDER_MIGRATION.md  # История/детали provider-слоя
│   ├── ISSUE_TRACKER_YANDEX_CONTRACT.md     # Контрактные тесты: не сломать Yandex при Jira
│   ├── SLA_BUGS_TAB.md                # Вкладка «Баги»: секции, сигналы, UI, API
│   ├── SLA_BUGS_SIGNALS.md            # Краткий каталог сигналов на карточках
│   ├── STRUCTURE.md                   # Feature-based архитектура
│   ├── QUARTERLY_PLANNING.md          # Архив: квартальный план (не развивать)
│   ├── AGENT_TESTING_GUIDE.md         # Тест-кейсы для агентов
│   ├── ICONS.md                       # Руководство по иконкам
│   ├── REFACTORING_BACKLOG.md         # Что отрефакторено и бэклог рефакторинга
│   └── ZINDEX.md                      # Работа с z-index
├── BUGS_AND_TASKS.md                  # Известные проблемы и задачи
├── REFACTORING_SUMMARY.md             # Сводка по реструктуризации
└── SIDEBAR_MIGRATION.md               # Миграция сайдбара
```

## 🎯 С чего начать?

### Для новых разработчиков

1. **[README.md](../README.md)** — установка и настройка
2. **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** — что это, для кого, функции, стек
3. **[ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md)** — Yandex Tracker / Jira на инстансе
4. **[STRUCTURE.md](./STRUCTURE.md)** — архитектура проекта
5. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** — работа с API
6. **[API_BACKENDS.md](./API_BACKENDS.md)** — какой бэкенд у какого `/api` маршрута

### Для пользователей

1. **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** — обзор продукта и возможностей
2. **[CAPABILITIES.md](./CAPABILITIES.md)** — расширенный список функций
3. **[AGENT_TESTING_GUIDE.md](./AGENT_TESTING_GUIDE.md)** — как использовать функции

### Для тестировщиков

1. **[AGENT_TESTING_GUIDE.md](./AGENT_TESTING_GUIDE.md)** — тест-кейсы

## 📚 Категории документации

### 🚀 Основная документация

| Документ | Описание | Аудитория |
|----------|----------|-----------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Единый обзор продукта (что / для кого / функции) | Все |
| [CAPABILITIES.md](./CAPABILITIES.md) | Детальный список возможностей | Все |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | API, архитектура запросов | Разработчики |
| [API_BACKENDS.md](./API_BACKENDS.md) | Маршруты `/api` → issue tracker, PostgreSQL | Разработчики |
| [SPRINT_CONTEXT.md](./SPRINT_CONTEXT.md) | Read-only planning graph JSON для агентов | Разработчики, агенты |
| [ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md) | Yandex Tracker и Jira: выбор провайдера, auth | Все |
| [ISSUE_TRACKER_PROVIDER_MIGRATION.md](./ISSUE_TRACKER_PROVIDER_MIGRATION.md) | Детали provider-слоя / история миграции routes | Разработчики |
| [ISSUE_TRACKER_YANDEX_CONTRACT.md](./ISSUE_TRACKER_YANDEX_CONTRACT.md) | Контрактные тесты Yandex при развитии Jira | Разработчики |
| [SLA_BUGS_TAB.md](./SLA_BUGS_TAB.md) | Вкладка «Баги»: секции, критерии, сигналы, сортировка, UI, API | Разработчики, PM |
| [SLA_BUGS_SIGNALS.md](./SLA_BUGS_SIGNALS.md) | Краткий каталог сигналов на карточках (для согласования) | Разработчики, PM |
| [COMMERCIAL_DB_CONTRACT.md](./COMMERCIAL_DB_CONTRACT.md) | Схема `beer_tracker`: каталог teams/staff и миграция для существующей БД | Разработчики, DevOps |
| [STRUCTURE.md](./STRUCTURE.md) | Feature-based архитектура | Разработчики |
| [FOLDER_NAMING.md](./FOLDER_NAMING.md) | Именование папок (kebab vs PascalCase для доменов) | Разработчики |
| [README.md](./README.md) | Навигация по документации | Все |

### 🔧 Специализированные руководства

| Документ | Описание | Аудитория |
|----------|----------|-----------|
| [ICONS.md](./ICONS.md) | Использование иконок | Разработчики |
| [ZINDEX.md](./ZINDEX.md) | Работа с z-index | Разработчики |
| [AGENT_TESTING_GUIDE.md](./AGENT_TESTING_GUIDE.md) | Тест-кейсы планера | Тестировщики |
| [steering/product.md](./steering/product.md) | Что в продукте и что не развивать | Все |

### 📄 Дополнительные материалы

| Документ | Описание | Аудитория |
|----------|----------|-----------|
| [QUARTERLY_PLANNING.md](./QUARTERLY_PLANNING.md) | Архив кода квартального плана (не развивать) | Разработчики |
| [BUGS_AND_TASKS.md](../BUGS_AND_TASKS.md) | Известные проблемы | Все |
| [REFACTORING_SUMMARY.md](../REFACTORING_SUMMARY.md) | Реструктуризация проекта | Разработчики |
| [REFACTORING_BACKLOG.md](./REFACTORING_BACKLOG.md) | Что уже отрефакторено и бэклог на будущее | Разработчики |
| [SIDEBAR_MIGRATION.md](../SIDEBAR_MIGRATION.md) | Миграция сайдбара | Разработчики |

## 🔍 Поиск по темам

### По функциональности

- **Планирование спринтов** → [CAPABILITIES.md](./CAPABILITIES.md#1-планирование-спринтов)
- **Бэклог** → [CAPABILITIES.md](./CAPABILITIES.md#2-управление-бэклогом)
- **Burndown Chart** → [CAPABILITIES.md](./CAPABILITIES.md#4-burndown-chart)
- **SLA-баги (вкладка «Баги»)** → [SLA_BUGS_TAB.md](./SLA_BUGS_TAB.md), [SLA_BUGS_SIGNALS.md](./SLA_BUGS_SIGNALS.md)
- **Цели спринта** → [CAPABILITIES.md](./CAPABILITIES.md#5-цели-спринта)
- **Что не развивать** → [steering/product.md](./steering/product.md)

### По техническим вопросам

- **API** → [API_DOCUMENTATION.md](./API_DOCUMENTATION.md), [API_BACKENDS.md](./API_BACKENDS.md), [SPRINT_CONTEXT.md](./SPRINT_CONTEXT.md), [ISSUE_TRACKER_PROVIDER_MIGRATION.md](./ISSUE_TRACKER_PROVIDER_MIGRATION.md), [ISSUE_TRACKER_YANDEX_CONTRACT.md](./ISSUE_TRACKER_YANDEX_CONTRACT.md)
- **Архитектура** → [STRUCTURE.md](./STRUCTURE.md)
- **Именование папок (домены)** → [FOLDER_NAMING.md](./FOLDER_NAMING.md)

- **База данных** → [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#распределение-эндпоинтов-по-источникам-данных), [COMMERCIAL_DB_CONTRACT.md](./COMMERCIAL_DB_CONTRACT.md)
- **Иконки** → [ICONS.md](./ICONS.md)
- **Z-index и слои** → [ZINDEX.md](./ZINDEX.md)
- **Тестирование** → [AGENT_TESTING_GUIDE.md](./AGENT_TESTING_GUIDE.md)
- **Рефакторинг** → [REFACTORING_BACKLOG.md](./REFACTORING_BACKLOG.md)

## 📝 Обновление документации

Документация обновляется по мере развития проекта. При добавлении нового документа:

1. Добавьте его в этот индекс
2. Добавьте ссылку в соответствующий раздел [README.md](../README.md), если документ стартовый
3. Не описывайте deprecated-экраны (эпики, квартал) как текущие возможности

---

**Последнее обновление:** сентябрь 2026
