# Руководство по работе с иконками

Документация по использованию и управлению иконками в проекте Beer Tracker.

## Быстрый старт

```tsx
import { Icon } from '@/components/Icon';

// Базовое использование
<Icon name="calendar" className="w-4 h-4" />

// С цветом и темной темой
<Icon name="check" className="w-5 h-5 text-green-600 dark:text-green-400" />

// В кнопке
<button className="flex items-center gap-2">
  <Icon name="plus" className="w-4 h-4" />
  Добавить
</button>
```

## Система иконок

### Архитектура

Проект использует компонент `components/Icon.tsx`, который рендерит SVG иконки напрямую (`viewBox="0 0 24 24"`) с поддержкой:
- ✅ `currentColor` для управления цветом через CSS
- ✅ Темная/светлая тема через Tailwind
- ✅ Типизация TypeScript
- ✅ Автоматическое предупреждение о несуществующих иконках (`console.warn`, компонент возвращает `null`)
- ✅ Проп `size?: 'sm' | 'md' | 'lg'` (`w-4 h-4` / `w-5 h-5` / `w-6 h-6`, по умолчанию `md`) — применяется, только если не передан `className`

### Структура файлов

```
components/
├── Icon.tsx               # Компонент для всех иконок
├── iconGlyphs.tsx         # Словарь глифов (часть 1)
├── iconGlyphsMore.tsx     # Словарь глифов (часть 2) + iconOffsets (сдвиги для priority-* / issue-*)
└── iconSizeClassName.ts   # Маппинг size → классы
public/assets/icons/       # Публичные SVG (для справки, в Icon не используются)
```

**Важно:** Для использования иконок импортируйте только `Icon` из `@/components/Icon`. Глифы добавляются в `iconGlyphs.tsx` / `iconGlyphsMore.tsx`.

## Каталог иконок

### 🎯 Иконки приоритетов (5)

Специальные дизайны из Yandex Tracker для визуализации приоритета задач:

| Имя | Описание | Использование |
|-----|----------|---------------|
| `priority-blocker` | 🔴 Blocker - восклицательный знак в круге | Критические блокеры |
| `priority-critical` | 🟠 Critical - двойной chevron вверх | Критический приоритет |
| `priority-medium` | ⚪ Medium - две линии | Средний приоритет |
| `priority-low` | ⬇️ Low - chevron вниз | Низкий приоритет |
| `priority-trivial` | ⏬ Trivial - двойной chevron вниз | Незначительный |

**Пример:**
```tsx
// Используйте через компонент PriorityIcon
import { PriorityIcon } from '@/components/PriorityIcon';
<PriorityIcon priority="critical" />

// Или напрямую
<Icon name="priority-blocker" className="w-4 h-4 text-red-600" />
```

### 🐛 Иконки типов задач (5)

Каждый тип задачи имеет уникальный дизайн и рекомендованный цвет:

| Имя | Цвет | Использование |
|-----|------|---------------|
| `issue-bug` | 🔴 Красный | Баги и ошибки |
| `issue-task` | 🔵 Синий | Обычные задачи |
| `issue-epic` | 🟣 Фиолетовый | Эпики |
| `issue-story` | 🟢 Зеленый | Пользовательские истории |
| `issue-draft` | 🟠 Янтарный | Черновики |

**Пример:**
```tsx
// Используйте через компонент IssueTypeIcon
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
<IssueTypeIcon type="bug" />

// Или напрямую с правильным цветом
<Icon name="issue-bug" className="w-4 h-4 text-red-600 dark:text-red-400" />
```

### 🔧 Общие иконки

Полный список — ключи словарей в `components/iconGlyphs.tsx` и `components/iconGlyphsMore.tsx` (на 2026-10-25 всего 99 имён, включая priority-* и issue-*). Основные группы:

#### Навигация
- `chevron-down`, `chevron-down-bold`, `chevron-up`, `chevron-left`, `chevron-right`, `arrow-left`, `arrow-right`

#### Действия
- `plus`, `plus-bold`, `minus`, `minus-bold` — добавление / удаление
- `check`, `check-bold`, `check-circle`, `check-square` — подтверждение, успех
- `x`, `x-bold`, `close`, `circle-x` — закрытие
- `edit`, `trash`, `copy`, `scissors`, `archive`, `undo`, `redo`
- `drag-handle`, `grip-vertical` — перетаскивание

#### Медиа и таймеры
- `play`, `play-fill`, `pause`, `pause-fill`, `stop`, `stopwatch`, `clock`

#### Редактор текста
- `bold`, `italic`, `strikethrough`, `code`, `code-block`, `quote`, `list`, `list-ordered`, `link`, `image`, `hash`

#### UI элементы
- `calendar`, `spinner`, `loader`, `search`, `menu`, `refresh`, `home`, `settings`, `minimize`, `maximize`
- `sun`, `moon`, `tree`, `snowflake`, `sparkles` — тема / сезонные / AI
- `alert-triangle`, `warning`, `exclamation`, `circle-info`, `circle-help` — статусы и подсказки
- `eye`, `eye-off`, `lock`, `log-out`, `mail`, `user`, `users`
- `comment`, `comment-plus`, `file`, `file-text`, `diagram`, `dots-horizontal`

#### Планер и доменные
- `backlog`, `timeline`, `phase-segments`, `plan-add`, `test-plan`, `target`, `bar-chart`, `trend-down`, `crane`, `wrench`

## Примеры использования

### Базовые примеры

```tsx
import { Icon } from '@/components/Icon';

// 1. Простая иконка
<Icon name="calendar" className="w-4 h-4" />

// 2. С цветом
<Icon name="check" className="w-5 h-5 text-green-600" />

// 3. С темной темой
<Icon name="spinner" className="w-4 h-4 text-blue-600 dark:text-blue-400" />

// 4. С анимацией
<Icon name="spinner" className="animate-spin h-6 w-6 text-blue-600" />
```

### Кнопки с иконками

```tsx
// Кнопка добавления
<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
  <Icon name="plus" className="w-4 h-4" />
  Добавить задачу
</button>

// Кнопка-иконка
<button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
  <Icon name="edit" className="w-5 h-5" />
</button>

// Кнопка с загрузкой
<button disabled={isLoading}>
  {isLoading ? (
    <Icon name="spinner" className="animate-spin w-5 h-5" />
  ) : (
    <>
      <Icon name="check" className="w-5 h-5" />
      Сохранить
    </>
  )}
</button>
```

### Поля ввода с иконками

```tsx
// Поиск
<div className="relative">
  <Icon 
    name="search" 
    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
  />
  <input 
    className="pl-10 pr-4 py-2 border rounded-lg" 
    placeholder="Поиск..."
  />
</div>

// С кнопкой очистки
<div className="relative">
  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
  <input value={query} onChange={e => setQuery(e.target.value)} />
  {query && (
    <button 
      onClick={() => setQuery('')}
      className="absolute right-3 top-1/2 -translate-y-1/2"
    >
      <Icon name="x" className="w-4 h-4 text-gray-400 hover:text-gray-600" />
    </button>
  )}
</div>
```

### Состояния и индикаторы

```tsx
// Статус с иконкой
<div className="flex items-center gap-2">
  <div className={`rounded-full p-1 ${
    status === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`}>
    <Icon 
      name={status === 'success' ? 'check' : 'x'} 
      className="w-3 h-3 text-white" 
    />
  </div>
  <span>{statusText}</span>
</div>

// Загрузка с текстом
{isLoading && (
  <div className="flex items-center gap-2 text-gray-600">
    <Icon name="spinner" className="animate-spin w-4 h-4" />
    <span>Загрузка данных...</span>
  </div>
)}
```

### Меню и навигация

```tsx
// Выпадающее меню
<button className="flex items-center gap-2">
  <span>Выберите опцию</span>
  <Icon 
    name={isOpen ? "chevron-up" : "chevron-down"} 
    className="w-4 h-4 transition-transform" 
  />
</button>

// Навигация
<nav className="flex gap-4">
  <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
    <Icon name="home" className="w-4 h-4" />
    Главная
  </a>
  <a href="/calendar" className="flex items-center gap-2">
    <Icon name="calendar" className="w-4 h-4" />
    Календарь
  </a>
</nav>
```

### Модальные окна

```tsx
// Заголовок модального окна с кнопкой закрытия
<div className="flex items-center justify-between p-4 border-b">
  <h2 className="text-xl font-semibold">Заголовок</h2>
  <button 
    onClick={onClose}
    className="text-gray-400 hover:text-gray-600"
  >
    <Icon name="x" className="w-6 h-6" />
  </button>
</div>
```

## Best Practices

### 1. Размеры иконок

Используйте консистентные размеры:

```tsx
// Маленькие (в текстах, тегах)
<Icon name="check" className="w-3 h-3" />

// Стандартные (в кнопках, формах)
<Icon name="plus" className="w-4 h-4" />

// Средние (заголовки, акценты)
<Icon name="calendar" className="w-5 h-5" />

// Большие (пустые состояния, иллюстрации)
<Icon name="search" className="w-8 h-8" />
```

### 2. Цвета и темная тема

Всегда указывайте цвет для темной темы:

```tsx
// ✅ Правильно
<Icon name="check" className="w-4 h-4 text-green-600 dark:text-green-400" />

// ❌ Неправильно (будет плохо видно в темной теме)
<Icon name="check" className="w-4 h-4 text-green-600" />
```

### 3. Семантика

Используйте правильные иконки для правильного контекста:

```tsx
// ✅ Правильно - plus для добавления
<button><Icon name="plus" /> Добавить</button>

// ❌ Неправильно - check для добавления
<button><Icon name="check" /> Добавить</button>

// ✅ Правильно - x для закрытия
<button onClick={onClose}><Icon name="x" /></button>

// ❌ Неправильно - trash для закрытия
<button onClick={onClose}><Icon name="trash" /></button>
```

### 4. Доступность

Добавляйте текстовые альтернативы:

```tsx
// Кнопка только с иконкой - добавьте aria-label
<button aria-label="Закрыть" onClick={onClose}>
  <Icon name="x" className="w-5 h-5" />
</button>

// Или используйте title
<button title="Редактировать задачу">
  <Icon name="edit" className="w-4 h-4" />
</button>

// Декоративные иконки (с текстом) - ничего не нужно
<button>
  <Icon name="plus" className="w-4 h-4" />
  Добавить
</button>
```

### 5. Производительность

Иконки рендерятся напрямую, но избегайте излишнего использования:

```tsx
// ✅ Хорошо - одна иконка на элемент
<div className="flex items-center gap-2">
  <Icon name="calendar" className="w-4 h-4" />
  <span>15.03.2024</span>
</div>

// ⚠️ Избыточно - несколько иконок без необходимости
<div>
  <Icon name="calendar" />
  <Icon name="check" />
  <Icon name="x" />
  <span>15.03.2024</span>
</div>
```

## Добавление новых иконок

### Шаг 1: Подготовьте SVG

```xml
<!-- Убедитесь, что SVG использует currentColor -->
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path 
    d="M12 2L2 7l10 5 10-5-10-5z" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  />
</svg>
```

### Шаг 2: Добавьте глиф в iconGlyphs.tsx или iconGlyphsMore.tsx

```tsx
// components/iconGlyphsMore.tsx
export const iconGlyphsMore: Record<string, ReactNode> = {
  // ... существующие иконки
  
  // Добавьте вашу иконку
  'your-icon-name': (
    <path 
      d="..." 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
    />
  ),
};
```

### Шаг 3: Используйте новую иконку

```tsx
<Icon name="your-icon-name" className="w-4 h-4" />
```

### Рекомендации для новых иконок

1. **ViewBox:** Используйте стандартный `viewBox="0 0 24 24"`
2. **currentColor:** Всегда используйте `currentColor` вместо конкретных цветов. По умолчанию `<svg>` рендерится с `fill="none"` (stroke-иконки); `fill="currentColor"` включается только для `sun`, `moon`, `tree`, `sparkles` (список в `Icon.tsx`)
3. **Толщина линий:** `strokeWidth="2"` для консистентности
4. **Закругления:** `strokeLinecap="round"` и `strokeLinejoin="round"`
5. **Имена:** Используйте kebab-case: `icon-name`, `chevron-down`
6. **Категории:** Группируйте похожие иконки (navigation, actions, ui)

## Устранение проблем

### Иконка не отображается

```tsx
// Проверьте имя иконки
<Icon name="caelndar" />  // ❌ Опечатка
<Icon name="calendar" />  // ✅ Правильно

// Проверьте консоль - должно быть предупреждение
// Console: Icon "caelndar" not found
```

### Неправильный цвет

```tsx
// Убедитесь, что цвет задан через text-*
<Icon name="check" className="bg-green-600" />  // ❌ Не сработает
<Icon name="check" className="text-green-600" />  // ✅ Правильно

// Для fill иконок (не stroke)
<Icon name="issue-bug" className="text-red-600" />  // ✅ Работает для fill
```

### Иконка слишком большая/маленькая

```tsx
// Размер задается через w-* и h-*
<Icon name="plus" className="w-20 h-20" />  // Слишком большая
<Icon name="plus" className="w-4 h-4" />    // Стандартный размер
```

## TypeScript

Компонент Icon типизирован:

```tsx
interface IconProps {
  className?: string;             // Tailwind классы (перекрывают size)
  name: string;                   // Имя иконки
  size?: 'lg' | 'md' | 'sm';      // Размер, если className не передан
}

// Использование
<Icon name="calendar" className="w-4 h-4 text-blue-600" />
```

Для улучшенной типизации можно добавить union type:

```tsx
// В Icon.tsx
type IconName = 
  | 'calendar'
  | 'check'
  | 'plus'
  // ... остальные имена

interface IconProps {
  name: IconName;
  className?: string;
}
```

## Миграция с других систем

### Если вы используете inline SVG

```tsx
// Было
<svg className="w-4 h-4" viewBox="0 0 24 24">
  <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" />
</svg>

// Стало
<Icon name="plus" className="w-4 h-4" />
```

### Если вы используете img теги

```tsx
// Было
<img src="/icons/calendar.svg" className="w-4 h-4" />

// Стало
<Icon name="calendar" className="w-4 h-4" />
```

### Если вы используете другую библиотеку

```tsx
// Было (например, react-icons)
import { FaCalendar } from 'react-icons/fa';
<FaCalendar className="w-4 h-4" />

// Стало
import { Icon } from '@/components/Icon';
<Icon name="calendar" className="w-4 h-4" />
```

## Справочная информация

**Всего иконок:** 99 (на 2026-10-25)  
**Файлов, импортирующих `Icon`:** ~190  
**Поддержка темной темы:** Да  
**Поддержка currentColor:** Да  
**TypeScript:** Да

### Связанные файлы

- `components/Icon.tsx` - Основной компонент
- `components/iconGlyphs.tsx`, `components/iconGlyphsMore.tsx` - Словари глифов
- `components/iconSizeClassName.ts` - Размеры по пропу `size`
- `components/PriorityIcon.tsx` - Обертка для иконок приоритетов (с тултипом)
- `components/IssueTypeIcon.tsx` - Обертка для иконок типов задач
- `public/assets/icons/` - Публичные SVG (для справки)

---

**Последнее обновление:** 25.10.2026  
**Версия:** 2.1
