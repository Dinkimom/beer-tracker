# Структура проекта Beer Tracker

## 📁 Новая Feature-Based архитектура

Проект реорганизован по **domain-driven** принципу - каждая фича изолирована со своими компонентами, хуками и утилитами.

### 🎯 Основные преимущества

- ✅ **Коллокация**: Все файлы фичи находятся рядом
- ✅ **Масштабируемость**: Легко добавлять новые фичи
- ✅ **Изоляция**: Легко удалить или заменить фичу
- ✅ **Понятность**: Сразу видно границы каждого модуля
- ✅ **Переиспользование**: Shared код вынесен отдельно

## 📂 Структура папок

```
beer-tracker/
├── features/                    # 🆕 Все фичи приложения (только используемые папки)
│   ├── sprint/                  # Домен: Спринты
│   │   ├── components/
│   │   │   ├── SprintPlanner.tsx      # Главный контейнер планировщика
│   │   │   ├── SprintSelector.tsx
│   │   │   ├── DaysHeader.tsx
│   │   │   ├── SprintGoalsModal.tsx
│   │   │   ├── StartSprintModal.tsx
│   │   │   └── FinishSprintModal.tsx
│   │   ├── hooks/
│   │   │   ├── useSprints.ts
│   │   │   ├── useGoals.ts
│   │   │   └── useGoalManagement.ts
│   │   └── utils/
│   │       ├── sprintMetrics.ts
│   │       ├── sprintStartChecks.ts
│   │       └── goalUtils.ts
│   │
│   ├── task/                    # Домен: Задачи
│   │   ├── components/
│   │   │   ├── DraggableTask/         # DnD-карточка (сайдбар + бэклог)
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskCardBody.tsx
│   │   │   ├── TaskCardContent.tsx
│   │   │   ├── TaskCardTags.tsx
│   │   │   ├── TaskBar.tsx
│   │   │   └── TaskTimeline.tsx
│   │   ├── hooks/
│   │   │   ├── useTasks.ts
│   │   │   ├── useTaskFiltering.ts
│   │   │   ├── useTaskGrouping.ts
│   │   │   ├── useTaskLinking.ts
│   │   │   ├── useTaskMutations.ts
│   │   │   └── useTaskService.ts
│   │   ├── services/
│   │   │   └── TaskService.ts
│   │   └── utils/
│   │       ├── taskUtils.ts
│   │       ├── taskValidation.ts
│   │       └── autoAssignTasks.ts
│   │
│   ├── sidebar/                 # 🆕 Домен: Планировщик сайдбар
│   │   └── components/
│   │       ├── Sidebar.tsx            # Главный контейнер (592 строки!)
│   │       ├── SidebarHeader.tsx
│   │       ├── SidebarFilters.tsx
│   │       ├── GoalItem.tsx
│   │       ├── SprintMetrics.tsx
│   │       ├── DevelopersManagement.tsx
│   │       └── tabs/
│   │           ├── TasksTab.tsx       # Задачи спринта
│   │           ├── BacklogTab.tsx     # Бэклог
│   │           ├── GoalsTab.tsx       # Цели спринта
│   │           ├── InvalidTab.tsx     # Невалидные задачи
│   │           └── SettingsTab.tsx    # Настройки разработчиков
│   │
│   ├── swimlane/                # Домен: Свимлейны
│   │   ├── components/
│   │   │   ├── Swimlane.tsx           # Главный контейнер свимлейна
│   │   │   ├── DeveloperHeader.tsx
│   │   │   ├── DroppableCell.tsx
│   │   │   ├── TaskArrows.tsx
│   │   │   └── ConnectionPoint.tsx
│   │   ├── hooks/
│   │   │   ├── useDragAndDrop.ts
│   │   │   ├── useLinkAnchors.ts
│   │   │   └── useLinkRestoration.ts
│   │   └── utils/
│   │       ├── layerUtils.ts
│   │       └── positionUtils.ts
│   │
│   ├── developers/              # Домен: Управление разработчиками
│   │   └── hooks/
│   │       └── useDevelopersManagement.ts
│   │
│   ├── qa/                      # Домен: QA логика
│   │   └── utils/
│   │       ├── qaStatusMapper.ts
│   │       ├── qaTaskPlacement.ts
│   │       └── qaTaskUtils.ts
│   │
│   ├── board/                   # Домен: Выбор доски
│   │   └── components/
│   │       └── BoardSelector.tsx
│   │
│   ├── context-menu/            # Домен: Контекстное меню
│   │   ├── components/
│   │   │   ├── ContextMenu.tsx
│   │   │   ├── SprintSubmenu.tsx
│   │   │   └── StatusSubmenu.tsx
│   │   └── utils/
│   │       └── submenuPositioning.ts
│   │
│   ├── account/                 # Домен: Учет работы
│   │   └── components/
│   │       └── AccountWorkModal.tsx
│   │
│   └── comments/                # Домен: Комментарии
│       └── components/
│           └── CommentCard.tsx
│
├── components/                  # ♻️ Shared компоненты
│   ├── Icon.tsx                 # Используется во многих фичах
│   ├── IssueTypeIcon.tsx
│   ├── PriorityIcon.tsx
│   ├── Tooltip.tsx
│   ├── ErrorBoundary.tsx
│   └── QueryProvider.tsx
│
├── hooks/                       # ♻️ Shared хуки
│   ├── useLocalStorage.ts       # Используется в разных фичах
│   ├── useApiStorage.ts
│   └── usePerformance.ts
│
├── utils/                       # ♻️ Shared утилиты
│   ├── dateUtils.ts             # Общие функции для работы с датами
│   ├── constants.ts
│   ├── statusColors.ts
│   ├── statusMapper.ts
│   ├── linkAnchors.ts
│   └── translations.ts
│
├── lib/                         # 📚 Библиотеки и API клиенты
│   ├── axios.ts
│   ├── db.ts
│   ├── env.ts
│   ├── beerTrackerApi.ts
│   ├── trackerApi.ts
│   └── validation.ts
│
├── contexts/                    # 🔄 React контексты
│   └── SprintContext.tsx
│
├── types/                       # 📝 TypeScript типы
│   └── index.ts
│
├── app/                         # 🚀 Next.js App Router
│   ├── api/                     # API routes
│   ├── page.tsx                 # Главная страница
│   ├── layout.tsx
│   └── select-board/
│
├── database/                    # 🗄️ База данных
│   ├── init.sql
│   └── migrations/
│
├── docs/                        # 📖 Документация
│   ├── API_DOCUMENTATION.md
│   └── ICONS.md
│
└── public/                      # 🎨 Статические файлы
        └── assets/
            └── icons/
```

## Квартальное планирование — **deprecated**

Каноничная реализация находится в `features/quarterly-planning-v2`. Экран отключён от основной навигации, не развивать. Обзор: [QUARTERLY_PLANNING.md](./QUARTERLY_PLANNING.md).

## 🎨 Принципы организации

### 1. Feature-First подход

Каждая **feature** (домен) - это самодостаточный модуль:

```typescript
features/sprint/
├── components/    # UI компоненты этой фичи
├── hooks/        # Хуки только для этой фичи
├── utils/        # Утилиты только для этой фичи
└── services/     # Сервисы (при необходимости)
```

### 2. Shared - только общее

В `components/`, `hooks/`, `utils/` попадает **только то, что используется в 2+ фичах**:

- ✅ `Icon.tsx` - используется в sprint, board, task
- ✅ `useLocalStorage.ts` - используется в sprint, developers
- ❌ `useSprints.ts` - используется только в sprint → `features/sprint/hooks/`

### 3. Импорты

```typescript
// ✅ Импорт из своей фичи (абсолютный путь)
import { useSprints } from '@/features/sprint/hooks/useSprints';

// ✅ Импорт из другой фичи (абсолютный путь)
import { TaskCard } from '@/features/task/components/TaskCard';
import { Sidebar } from '@/features/sidebar/components/Sidebar';

// ✅ Импорт shared компонента
import { Icon } from '@/components/Icon';

// ✅ Импорт shared хука
import { useLocalStorage } from '@/hooks/useLocalStorage';

// ✅ Импорт shared утилиты
import { formatDate } from '@/utils/dateUtils';

// ❌ Относительные импорты НЕ используются
import { Icon } from '../../../components/Icon'; // ПЛОХО
```

### 4. Стратегия масштабирования при добавлении новых страниц

#### 📄 Принцип: Страница = Композиция фич

Когда появятся новые страницы, следуем философии:
- **`features/`** = переиспользуемые домены (кирпичики)
- **`app/`** = страницы (композиция кирпичиков)

#### Пример: Новая страница аналитики

```typescript
// app/analytics/page.tsx
import { Sidebar } from '@/features/sidebar/components/Sidebar';
import { TaskList } from '@/features/task/components/TaskList';
import { AnalyticsChart } from '@/features/analytics/components/Chart';

export default function AnalyticsPage() {
  return (
    <div>
      <Sidebar variant="compact" tabs={['tasks']} />
      <AnalyticsChart />
      <TaskList filter="completed" />
    </div>
  );
}
```

#### Преимущества:
- ✅ **Переиспользование**: Sidebar используется на разных страницах
- ✅ **Гибкость**: Страница комбинирует нужные features
- ✅ **Изоляция**: Features не знают о страницах
- ✅ **Простота**: Одна фича = один домен в `features/`

#### Когда создавать новый feature-домен:
- ✅ Логика переиспользуется на 2+ страницах
- ✅ Это самостоятельная бизнес-сущность
- ✅ Можно изолировать от других доменов

#### Когда код остается в `app/`:
- ❌ Специфичная логика только для одной страницы
- ❌ Композиция существующих features
- ❌ Простые лейауты без бизнес-логики

## 🔍 Как найти код?

### Старая структура → Новая структура

| Что ищете | Где было | Где теперь |
|-----------|----------|------------|
| SprintPlanner | `components/` | `features/sprint/components/` |
| TaskCard | `components/` | `features/task/components/` |
| TaskSidebar | `components/TaskSidebar/` | `features/sidebar/components/Sidebar.tsx` |
| Swimlane | `components/` | `features/swimlane/components/` |
| useSprints | `hooks/` | `features/sprint/hooks/` |
| useTasks | `hooks/` | `features/task/hooks/` |
| useDragAndDrop | `hooks/` | `features/swimlane/hooks/` |
| sprintMetrics | `utils/` | `features/sprint/utils/` |
| taskUtils | `utils/` | `features/task/utils/` |
| qaTaskUtils | `utils/` | `features/qa/utils/` |
| Icon (shared) | `components/` | `components/` ✅ |
| useLocalStorage (shared) | `hooks/` | `hooks/` ✅ |
| dateUtils (shared) | `utils/` | `utils/` ✅ |

## 📋 Что было удалено?

### ❌ Дубликаты

- `API_DOCUMENTATION.md` в корне → оставили только в `docs/`
- `assets/icons/` → оставили только `public/assets/icons/`
- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` → удалены (стандартные примеры Next.js)

## 🚀 Как добавить новую фичу?

1. Создайте папку в `features/`:
```bash
mkdir -p features/my-feature/{components,hooks,utils}
```

2. Создайте компоненты:
```typescript
// features/my-feature/components/MyComponent.tsx
export function MyComponent() {
  // ...
}
```

3. Создайте хуки (если нужно):
```typescript
// features/my-feature/hooks/useMyFeature.ts
export function useMyFeature() {
  // ...
}
```

4. Создайте утилиты (если нужно):
```typescript
// features/my-feature/utils/myUtils.ts
export function myHelper() {
  // ...
}
```

5. Используйте в приложении:
```typescript
import { MyComponent } from '@/features/my-feature/components/MyComponent';
import { useMyFeature } from '@/features/my-feature/hooks/useMyFeature';
```

## ✅ Проверка работоспособности

```bash
# TypeScript проверка
npx tsc --noEmit
# ✅ 0 ошибок

# ESLint проверка
pnpm lint
# ✅ 0 критических ошибок (только 4 warning)

# Запуск проекта
pnpm dev
# ✅ Работает
```

## 📈 Метрики рефакторинга

- **Удалено дубликатов**: 2 файла (документация) + 30 SVG иконок
- **Удалено пустых папок**: 19 папок
- **Перемещено файлов**: ~80 файлов
- **Обновлено импортов**: ~600+ импортов
- **Создано доменов**: 10 feature-доменов (добавлен `sidebar/`)
- **Shared компонентов**: 6
- **Shared хуков**: 3
- **Shared утилит**: 6

## 💬 Примечание по доменам

### Почему `sidebar/` - отдельный домен?
**Sidebar** (592 строки кода) - это **главный UI-контейнер планировщика**, объединяющий:
- 📋 Задачи (TasksTab, BacklogTab, InvalidTab)
- 🎯 Цели спринта (GoalsTab)
- 👥 Настройки разработчиков (SettingsTab)
- 📊 Метрики спринта
- 🔍 Фильтры и группировки

Это не просто компонент задач - это **композиция функционала из разных доменов**. Поэтому вынесен в отдельный домен, который можно переиспользовать на будущих страницах.

### Плоская структура доменов
Да, некоторые "домены" могли бы быть поддоменами других (например, `board/` → часть `sprint/`, `qa/` → часть `sprint/`, `developers/` → часть `swimlane/`). Но мы оставили плоскую структуру для:
- ✅ Простоты навигации
- ✅ Легкости поиска
- ✅ Гибкости при рефакторинге (легко переместить позже)
- ✅ Избежания глубокой вложенности

### Стратегия масштабирования
При добавлении новых страниц:
- **Features** остаются переиспользуемыми доменами
- **Страницы** (`app/`) - это композиция features
- Новый feature создается только если будет использоваться на 2+ страницах

---

**Последнее обновление**: декабрь 2025

