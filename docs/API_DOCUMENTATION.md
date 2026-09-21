# Документация API Beer Tracker


## Обзор

**Клиент** вызывает только Next.js API через **`beerTrackerApi`**. **Сервер** (`app/api/**`) использует **Yandex Tracker API** и **PostgreSQL** по схеме из [API_BACKENDS.md](./API_BACKENDS.md).

```
┌─────────────────────────────────────────────────────────────┐
│  Клиент: beerTrackerApi → /api/*                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  API Routes → Yandex Tracker API | PostgreSQL (снимки, планер)│
└─────────────────────────────────────────────────────────────┘
```

### Источники данных

Таблица **маршрут → бэкенды**: **[API_BACKENDS.md](./API_BACKENDS.md)**.

- **PostgreSQL** — `issue_snapshots`, staff/teams, планер, фичи и т.д.
- **Yandex Tracker API** — спринты, доски, мутации, часть чтений и changelog (см. таблицу).

## ⚠️ Важные правила

1. **Клиент НИКОГДА не обращается напрямую к Tracker API**
   - Все запросы идут через наш бэкенд (Next.js API Routes)
   - Клиент использует только `beerTrackerApi.ts`

2. **Сервер: Tracker API и PostgreSQL по маршруту**
   - `getTrackerApiFromRequest()` / `lib/trackerApi/*` для Yandex Tracker
   - `lib/snapshots/*`, `lib/db` и репозитории — для снимков и доменных таблиц (см. [API_BACKENDS.md](./API_BACKENDS.md))
   - Это обеспечивает безопасность (токены не попадают в клиент)

3. **Поддержка пользовательских токенов**
   - Пользователи могут настроить свой OAuth токен через UI
   - Токен хранится в localStorage и передается через headers
   - API routes используют `getTrackerApiFromRequest()` для получения клиента с правильным токеном
   - Если токен не настроен, используется серверный токен из .env
   - Подробнее: [USER_TOKEN_GUIDE.md](./USER_TOKEN_GUIDE.md)

4. **ЗАПРЕЩЕНО использование `fetch` напрямую**
   - ❌ НЕ используйте `fetch()` для API запросов
   - ✅ Используйте функции из `beerTrackerApi.ts` для клиентских запросов
   - ✅ На сервере — `getTrackerApiFromRequest(request)`, репозитории снимков/БД по образцу существующих `app/api/**/route.ts`
   - Исключение: загрузка статических файлов из `/public/` (но даже в этом случае предпочтительно использовать axios для консистентности)

5. **Типы вынесены в отдельный файл**
   - Все типы Tracker API находятся в `types/tracker.ts`
   - Импортируются как на клиенте, так и на сервере

## Структура API файлов

### 📁 `/lib/beerTrackerApi.ts` (КЛИЕНТ)
**Назначение:** Функции для работы с нашими Next.js API routes

**Когда использовать:**
- ✅ В клиентских компонентах (React)
- ✅ В хуках (useTasks, useSprints и т.д.)
- ✅ Вся работа с API с клиента

**Основные функции:**
- `fetchSprints()` - получение списка спринтов
- `fetchSprintTasks()` - получение задач спринта
- `fetchBacklog()` - получение задач бэклога
- `getIssue()` - получение информации о задаче
- `fetchIssueChangelog()` - получение changelog задачи
- `createIssue()` - создание задачи
- `addIssueToSprint()` - добавление задачи в спринт
- `removeIssueFromSprint()` - удаление задачи из спринта
- `changeIssueStatus()` - изменение статуса задачи
- `updateIssueWork()` - обновление story/test points
- `createRelatedIssue()` - создание связанной задачи
- `updateSprintStatus()` - обновление статуса спринта
- `fetchSprintPositions()` - получение позиций задач
- `saveTaskPosition()` - сохранение позиции задачи
- `fetchSprintLinks()` - получение связей между задачами
- `saveTaskLink()` - сохранение связи
- `fetchSprintComments()` - получение комментариев
- `saveComment()` - сохранение комментария
- И другие функции для работы с чеклистами, переходами статусов и т.д.

### 📁 `/lib/snapshots/*` и `lib/db` (СЕРВЕР) — актуально

**Назначение:** чтение и запись снимков задач и доменных таблиц в PostgreSQL приложения.

**Когда использовать:** в API routes для маршрутов из [API_BACKENDS.md](./API_BACKENDS.md), где указаны снимки или `lib/db`.


### 📁 `/lib/trackerApi.ts` (СЕРВЕР)
**Назначение:** Прямая работа с Yandex Tracker API

> ⚠️ **ВАЖНО**: Для поддержки пользовательских токенов используйте `getTrackerApiFromRequest(request)` из `/lib/api-tracker.ts` вместо прямого использования `trackerApi`

**Когда использовать:**
- ✅ ТОЛЬКО в API routes (серверная сторона)
- ✅ Для работы со спринтами (GET запросы)
- ✅ Для всех операций изменения данных (POST/PUT/DELETE)
- ❌ НИКОГДА в клиентских компонентах

**Основные функции:**
- `fetchSprintInfo()` - получение информации о спринте
- `fetchTrackerIssues()` - получение задач спринта (используется в `/api/tracker`)
- `updateTrackerSprintStatus()` - обновление статуса спринта
- `mapTrackerIssueToTask()` - маппинг задачи из Tracker в наш формат
- `extractDevelopers()` - извлечение разработчиков из задач

> ⚠️ **Примечание**: карточки задач и списки из снимков — **PostgreSQL** (`lib/snapshots`). `trackerApi` — спринты, мутации и маршруты, где в [API_BACKENDS.md](./API_BACKENDS.md) указан Tracker.

### 📁 `/lib/api-tracker.ts` (СЕРВЕР - РЕКОМЕНДУЕТСЯ)
**Назначение:** Утилиты для работы с Tracker API с поддержкой пользовательских токенов

**Когда использовать:**
- ✅ В API routes для создания Tracker API клиента
- ✅ Когда нужна поддержка пользовательских токенов
- ✅ Вместо прямого импорта `trackerApi`

**Основные функции:**
- `getTrackerApiFromRequest(request)` - создает Tracker API клиент с токеном из headers или fallback на .env

**Пример использования:**
```typescript
import { getTrackerApiFromRequest } from '@/lib/api-tracker';

export async function GET(request: NextRequest) {
  const trackerApi = getTrackerApiFromRequest(request);
  const { data } = await trackerApi.get('/sprints/123');
  return NextResponse.json(data);
}
```

### 📁 `/types/tracker.ts` (ОБЩИЕ ТИПЫ)
**Назначение:** TypeScript типы для работы с Tracker API

**Когда использовать:**
- ✅ В клиентских компонентах (для типизации)
- ✅ В API routes (для типизации)
- ✅ Везде, где нужны типы Tracker API

**Основные типы:**
- `SprintInfo` - информация о спринте
- `SprintListItem` - элемент списка спринтов
- `TrackerIssue` - задача из Tracker API
- `ChecklistItem` - элемент чеклиста
- `ChangelogEntry` - запись в changelog
- `SprintObject` - объект спринта
- `fetchIssueChangelog()` - получение истории изменений задачи

### 📁 `/lib/beerTrackerApi.ts`
**Назначение:** Работа через Next.js API Routes (клиентская часть)

**Когда использовать:**
- Клиентские компоненты (React hooks, UI)
- Работа с данными, которые сохраняются в нашей БД
- Нужна типизация и обработка ошибок на клиенте

**Категории функций:**

#### 🎯 Работа с задачами (Issues)
```typescript
// Получение информации о задаче
fetchIssueFull(issueKey: string): Promise<{...} | null>

// Получение задачи
getIssue(issueKey: string): Promise<{...} | null>

// Получение доступных переходов
getIssueTransitions(issueKey: string): Promise<Array<{...}>>

// Изменение статуса
changeIssueStatus(issueKey: string, transitionId: string, resolution?: string): Promise<boolean>

// Обновление work points
updateIssueWork(issueKey: string, storyPoints?: number, testPoints?: number): Promise<boolean>

// Создание задачи
createIssue(issueData: {...}): Promise<{success: boolean, key?: string}>

// Создание связанной задачи
createRelatedIssue(sourceIssueKey: string, data: {...}): Promise<{...}>
```

#### 📋 Работа с чеклистами
```typescript
// Обновление чекбокса
updateChecklistItem(issueKey: string, itemId: string, checked: boolean): Promise<boolean>

// Добавление элемента
addChecklistItem(issueKey: string, text: string, checked?: boolean): Promise<{...}>

// Обновление текста
updateChecklistItemText(issueKey: string, itemId: string, text: string): Promise<boolean>

// Удаление элемента
deleteChecklistItem(issueKey: string, itemId: string): Promise<boolean>

// Обновление порядка
updateChecklistOrder(issueKey: string, items: Array<{...}>): Promise<{...}>
```

#### 🏃 Работа со спринтами
```typescript
// Получение списка спринтов
fetchSprints(boardId: number): Promise<SprintsResponse[]>

// Получение задач спринта
fetchSprintTasks(sprintId: number): Promise<SprintTasksResponse>

// Обновление статуса спринта
updateSprintStatus(sprintId: number, status: string, version?: number): Promise<{...}>

// Добавление задачи в спринт
addIssueToSprint(issueKey: string, sprintId: number): Promise<boolean>

// Удаление задачи из спринта
removeIssueFromSprint(issueKey: string, sprintId: number): Promise<boolean>

// Удаление из всех спринтов
removeIssueFromAllSprints(issueKey: string): Promise<boolean>
```

#### 📍 Работа с позициями задач
```typescript
// Получение позиций
fetchSprintPositions(sprintId: number): Promise<TaskPosition[]>

// Сохранение позиции
saveTaskPosition(sprintId: number, position: {...}): Promise<boolean>

// Удаление позиции
deleteTaskPosition(sprintId: number, taskId: string): Promise<boolean>

// Очистка всех позиций
clearSprintPositions(sprintId: number): Promise<boolean>
```

#### 🔗 Работа со связями задач
```typescript
// Получение связей
fetchSprintLinks(sprintId: number): Promise<TaskLink[]>

// Сохранение связи
saveTaskLink(sprintId: number, link: {...}): Promise<boolean>

// Удаление связи
deleteTaskLink(sprintId: number, linkId: string): Promise<boolean>

// Очистка всех связей
clearSprintLinks(sprintId: number): Promise<boolean>
```

#### 💬 Работа с комментариями
```typescript
// Получение комментариев
fetchSprintComments(sprintId: number): Promise<Comment[]>

// Сохранение комментария
saveComment(sprintId: number, comment: {...}, isUpdate?: boolean): Promise<boolean>

// Удаление комментария
deleteComment(sprintId: number, commentId: string): Promise<boolean>
```

#### 📚 Работа с бэклогом
```typescript
// Получение задач бэклога
fetchBacklog(boardId: number, page?: number, perPage?: number): Promise<BacklogResponse>
```

---

## Как добавить новую функцию API

### Шаг 1: Определите тип функции

**Вариант А: GET-чтение снимков задач** → используйте функции из `lib/snapshots/*` в серверном API route
- Функция будет использоваться в серверных API routes
- Чтение задач, бэклога, стори, эпиков, changelog из PostgreSQL (`issue_snapshots`)
- Основные утилиты: `lib/snapshots/issueSnapshotRead.ts`, `lib/snapshots/backlogPayload.ts`

**Вариант Б: Работа со спринтами или изменение данных** → добавляйте в `trackerApi.ts`
- Функция будет использоваться в серверных API routes
- GET запросы к спринтам (не все спринты есть в экспортере)
- POST/PUT/DELETE запросы (изменение данных в Tracker)

**Вариант В: Работа через Next.js API** → добавляйте в `beerTrackerApi.ts`
- Функция будет использоваться в клиентских компонентах
- Данные нужно сохранять в БД
- Нужна единая обработка ошибок

### Шаг 2: Добавьте функцию в соответствующий файл

#### Пример для lib/snapshots (GET-чтение снимков):

```typescript
import { fetchSnapshotIssuesBySprintId } from '@/lib/snapshots/issueSnapshotRead';

/**
 * Краткое описание функции
 */
export async function mySnapshotFunction(
  organizationId: string,
  sprintId: number
): Promise<MyReturnType[]> {
  const issues = await fetchSnapshotIssuesBySprintId(organizationId, sprintId);
  return issues.map(/* преобразование в нужный формат */);
}
```

#### Пример для trackerApi.ts:

```typescript
/**
 * Краткое описание функции
 */
export async function myTrackerFunction(
  param1: string,
  param2?: number
): Promise<MyReturnType> {
  try {
    const response = await fetch(`${TRACKER_API_URL}/endpoint/${param1}`, {
      method: 'GET', // или POST, PATCH, DELETE
      headers: {
        Authorization: `OAuth ${TRACKER_OAUTH_TOKEN}`,
        'X-Org-ID': '<cloud_org_id из контекста tenant / organizations.tracker_org_id>',
        'Content-Type': 'application/json',
      },
      // Если нужен body:
      body: JSON.stringify({ param2 }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ...: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to ...:`, error);
    throw error; // или return null, в зависимости от логики
  }
}
```

#### Пример для beerTrackerApi.ts:

```typescript
/**
 * Краткое описание функции
 */
export async function myApiFunction(
  param1: string,
  param2?: number
): Promise<boolean> {
  try {
    const response = await fetch(`/api/my-endpoint/${param1}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ param2 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Failed to ...:`, error);
    return false;
  }
}
```

### Шаг 3: Создайте API Route (если используете beerTrackerApi)

Создайте файл `/app/api/my-endpoint/[param]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { myTrackerFunction } from '@/lib/trackerApi';

export async function POST(
  request: NextRequest,
  { params }: { params: { param: string } }
) {
  try {
    const { param2 } = await request.json();
    
    const result = await myTrackerFunction(params.param, param2);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Шаг 4: Добавьте типы (если нужно)

В начало файла `trackerApi.ts` или `beerTrackerApi.ts`:

```typescript
export interface MyReturnType {
  id: string;
  name: string;
  value: number;
}
```

### Шаг 5: Используйте функцию в компонентах/хуках

```typescript
import { myApiFunction } from '@/lib/beerTrackerApi';

// В компоненте или хуке:
const handleAction = async () => {
  const success = await myApiFunction('param1', 42);
  if (success) {
    // Обработка успеха
  } else {
    // Обработка ошибки
  }
};
```

---

## Best Practices

### ✅ DO (Правильно)

1. **Используйте правильный API файл**
   ```typescript
   // ✅ Клиентский компонент
   import { fetchSprints } from '@/lib/beerTrackerApi';
   
   // ✅ Серверный API route - GET запросы (задачи, бэклог, стори)
   import { fetchSnapshotIssuesBySprintId } from '@/lib/snapshots/issueSnapshotRead';
   
   // ✅ Серверный API route - спринты или изменение данных
   import { fetchSprintInfo, updateTrackerSprintStatus } from '@/lib/trackerApi';
   ```

2. **Обрабатывайте ошибки**
   ```typescript
   try {
     const result = await myApiFunction(param);
     if (!result) {
       throw new Error('Failed to get result');
     }
     // Обработка успеха
   } catch (error) {
     console.error('Error:', error);
     // Показать пользователю уведомление
   }
   ```

3. **Добавляйте JSDoc комментарии**
   ```typescript
   /**
    * Получает список активных спринтов для доски
    * @param boardId - ID доски в Tracker
    * @returns Массив спринтов или пустой массив при ошибке
    */
   export async function fetchActiveSprints(boardId: number): Promise<Sprint[]> {
     // ...
   }
   ```

4. **Используйте типизацию**
   ```typescript
   // ✅ С типами
   export async function fetchData(id: string): Promise<DataType> {
     // ...
   }
   
   // ❌ Без типов
   export async function fetchData(id) {
     // ...
   }
   ```

5. **Возвращайте консистентные типы**
   ```typescript
   // ✅ Всегда возвращаем объект с success
   return { success: true, data: result };
   return { success: false, error: 'Error message' };
   
   // ✅ Или всегда boolean
   return true;
   return false;
   ```

### ❌ DON'T (Неправильно)

1. **НЕ используйте `fetch` напрямую для API запросов**
   ```typescript
   // ❌ Плохо - прямой fetch
   const response = await fetch('/api/sprints?boardId=123');
   const data = await response.json();
   
   // ❌ Плохо - прямой fetch с обработкой
   const response = await fetch(`/api/features/${featureId}/diagrams/${diagramId}/image`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ svg: svgString }),
   });
   
   // ✅ Хорошо - используйте функции из beerTrackerApi
   import { fetchSprints, saveDiagramImage } from '@/lib/beerTrackerApi';
   const data = await fetchSprints(123);
   await saveDiagramImage(featureId, diagramId, svgString);
   ```

2. **НЕ дублируйте логику**
   ```typescript
   // ❌ Плохо - дублирование в каждом компоненте
   const response = await fetch(`/api/issues/${key}`);
   if (!response.ok) throw new Error('Failed');
   
   // ✅ Хорошо - один раз в API файле
   const issue = await getIssue(key);
   ```

3. **НЕ забывайте обрабатывать ошибки**
   ```typescript
   // ❌ Плохо
   const data = await fetchSprints(boardId);
   
   // ✅ Хорошо
   try {
     const data = await fetchSprints(boardId);
   } catch (error) {
     console.error('Error:', error);
   }
   ```

4. **НЕ смешивайте уровни абстракции**
   ```typescript
   // ❌ Плохо - вызов Tracker API из beerTrackerApi
   import { fetchTrackerIssues } from '@/lib/trackerApi';
   export async function getIssues() {
     return fetchTrackerIssues(123); // Используйте API route
   }
   
   // ❌ Плохо - прямой fetch вместо функции из beerTrackerApi
   export async function getIssues() {
     const response = await fetch('/api/issues');
     return response.json();
   }
   
   // ❌ Плохо - прямой вызов серверных функций в клиентском коде
   // серверные модули (lib/snapshots/*, lib/trackerApi/*) импортируются только в API routes
   
   // ✅ Хорошо - используйте функцию из beerTrackerApi на клиенте
   import { getIssue } from '@/lib/beerTrackerApi';
   const issue = await getIssue('TASK-123');
   
   // ✅ Хорошо - используйте lib/snapshots в API routes
   import { fetchSnapshotIssuesBySprintId } from '@/lib/snapshots/issueSnapshotRead';
   export async function GET(request: NextRequest) {
     const issues = await fetchSnapshotIssuesBySprintId(orgId, sprintId);
     return NextResponse.json(issues);
   }
   ```

5. **НЕ используйте `.then()/.catch()` - только async/await**
   ```typescript
   // ❌ Плохо - устаревший промис-синтаксис
   fetchSprints(boardId)
     .then(data => {
       console.log(data);
     })
     .catch(error => {
       console.error(error);
     });
   
   // ✅ Хорошо - современный async/await
   try {
     const data = await fetchSprints(boardId);
     console.log(data);
   } catch (error) {
     console.error(error);
   }
   ```

6. **НЕ используйте IIFE - создавайте именованные функции**
   ```typescript
   // ❌ Плохо - IIFE (Immediately Invoked Function Expression)
   (async () => {
     const data = await fetchData();
     setData(data);
   })();
   
   // ✅ Хорошо - именованная функция
   async function loadData() {
     const data = await fetchData();
     setData(data);
   }
   
   loadData();
   ```

---

## Примеры использования

### Пример 1: Получение и отображение задач спринта

```typescript
'use client';

import { useEffect, useState } from 'react';
import { fetchSprintTasks } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';

export function SprintTasksList({ sprintId }: { sprintId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchSprintTasks(sprintId);
        setTasks(data.tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [sprintId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>{task.name}</li>
      ))}
    </ul>
  );
}
```

### Пример 2: Изменение статуса задачи

```typescript
'use client';

import { useState } from 'react';
import { getIssueTransitions, changeIssueStatus } from '@/lib/beerTrackerApi';
import toast from 'react-hot-toast';

export function StatusChanger({ issueKey }: { issueKey: string }) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (transitionId: string) => {
    setLoading(true);
    
    try {
      const success = await changeIssueStatus(issueKey, transitionId);
      
      if (success) {
        toast.success('Status updated successfully');
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={() => handleStatusChange('transition-id')}
      disabled={loading}
    >
      Change Status
    </button>
  );
}
```

### Пример 3: Использование с React Query

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSprints, updateSprintStatus } from '@/lib/beerTrackerApi';

export function useSprints(boardId: number | null) {
  return useQuery({
    queryKey: ['sprints', boardId],
    queryFn: () => boardId ? fetchSprints(boardId) : [],
    enabled: !!boardId,
    staleTime: 1000 * 60 * 5, // 5 минут
  });
}

export function useUpdateSprintStatus(sprintId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ status, version }: { status: string; version?: number }) =>
      updateSprintStatus(sprintId, status, version),
    onSuccess: () => {
      // Инвалидируем кеш спринтов
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}
```

### Пример 4: Работа с чеклистами

```typescript
import { 
  addChecklistItem, 
  updateChecklistItem,
  deleteChecklistItem 
} from '@/lib/beerTrackerApi';

// Добавление элемента
const result = await addChecklistItem('TASK-123', 'New goal', false);
if (result.success) {
  console.log('Added item:', result.item);
}

// Обновление чекбокса
const success = await updateChecklistItem('TASK-123', 'item-id', true);
if (success) {
  console.log('Checkbox updated');
}

// Удаление элемента
const deleted = await deleteChecklistItem('TASK-123', 'item-id');
if (deleted) {
  console.log('Item deleted');
}
```

---

## Типы и интерфейсы

### Основные типы из trackerApi.ts

```typescript
interface SprintInfo {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  startDateTime: string;
  endDateTime: string;
  version?: number;
}

interface TrackerIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status?: { key: string; display: string };
  assignee?: { id: string; display: string };
  storyPoints?: number;
  testPoints?: number;
  // ... другие поля
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  checklistItemType: string;
  textHtml?: string;
}
```

### Типы возвращаемых значений

```typescript
// Простой boolean
Promise<boolean>

// Объект с success флагом
Promise<{ success: boolean; error?: string; data?: T }>

// Nullable результат
Promise<T | null>

// Массив данных
Promise<T[]>
```

---

## Отладка

### Логирование запросов

Все функции API логируют ошибки в консоль:

```typescript
console.error(`Failed to fetch sprints for board ${boardId}:`, error);
```

### Проверка Network в DevTools

1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Отфильтруйте по XHR/Fetch
4. Проверьте:
   - Статус код ответа
   - Headers запроса
   - Payload (тело запроса)
   - Response (ответ сервера)

### Типичные ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| 401 Unauthorized | Неверный токен | Проверьте `TRACKER_OAUTH_TOKEN` в `.env.local` |
| 404 Not Found | Неверный endpoint | Проверьте URL в запросе |
| 500 Internal Error | Ошибка на сервере | Проверьте логи API route |
| CORS Error | Проблема с CORS | Используйте API routes вместо прямых запросов |
| Type Error | Неверная типизация | Проверьте интерфейсы и типы |

---

## Миграция старого кода

Если у вас есть старый код с инлайн `fetch()` запросами:

### До:
```typescript
// ❌ Старый код с fetch
const response = await fetch(`/api/sprints?boardId=${boardId}`);
const sprints = await response.json();

// ❌ Или более сложный пример
const response = await fetch(`/api/features/${featureId}/diagrams/${diagramId}/image`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ svg: svgString }),
});
if (!response.ok) {
  throw new Error('Failed to save');
}
const { url } = await response.json();
```

### После:
```typescript
// ✅ Новый код с функциями из beerTrackerApi
import { fetchSprints, saveDiagramImage } from '@/lib/beerTrackerApi';

const sprints = await fetchSprints(boardId);

// ✅ Для сохранения изображения диаграммы
const { url } = await saveDiagramImage(featureId, diagramId, svgString);
```

---

## Контрольный чек-лист при добавлении новой функции

- [ ] Определен правильный API файл (lib/snapshots / trackerApi / beerTrackerApi)
- [ ] Добавлена функция с типизацией
- [ ] Добавлен JSDoc комментарий
- [ ] Добавлена обработка ошибок
- [ ] Для GET запросов: добавлена фильтрация по `boardId` через `team`/`queue` (если нужно)
- [ ] Создан API route (если нужно)
- [ ] Используется **async/await** (НЕ `.then()/.catch()`)
- [ ] Используются **именованные функции** (НЕ IIFE - `(async () => {})()`)
- [ ] Протестирована функция
- [ ] Обновлена эта документация (при необходимости)
- [ ] Код прошел линтер без ошибок

---

## Дополнительные ресурсы

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Yandex Tracker API](https://cloud.yandex.ru/docs/tracker/concepts/api)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## Распределение эндпоинтов по источникам данных

### Эндпоинты, читающие из PostgreSQL (snapshots)

- `/api/backlog` - получение задач бэклога
- `/api/stories` - получение списка стори и эпиков
- `/api/stories/[storyKey]` - получение конкретной стори
- `/api/stories/[storyKey]/tasks` - получение задач для стори
- `/api/issues/[issueKey]` - получение задачи
- `/api/issues/[issueKey]/changelog` - получение истории изменений
- `/api/issues/[issueKey]/transitions` - получение возможных переходов статусов

### Эндпоинты, использующие Tracker API

- `/api/sprints` - получение списка спринтов (GET)
- `/api/tracker` - получение задач спринта и информации о спринте (GET)
- Все POST/PUT/DELETE запросы - изменение данных в Tracker

---

*Последнее обновление: декабрь 2025*

