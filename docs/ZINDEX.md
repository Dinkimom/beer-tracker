# Работа с z-index в проекте

## Обзор

В проекте используется централизованная система управления z-index через константу `ZIndex` из `@/constants`. Это позволяет избежать конфликтов слоев и обеспечивает предсказуемую иерархию элементов интерфейса.

## Импорт

```typescript
import { ZIndex } from '@/constants';
```

## Иерархия слоев

Система z-index организована по слоям с четкими диапазонами значений:

Источник правды — [`constants/zIndex.ts`](../constants/zIndex.ts); ниже — значения на 2026-10-25.

### Базовый контент (0–9)
- **`base: 0`** — базовый уровень контента
- **`contentOverlay: 1`** — оверлеи поверх контента (например, стрелки связей задач)
- **`contentInteractive: 2`** — интерактивные элементы в контенте
- **`baselineOverBar: 3`** — бейзлайн поверх полос фаз (виден при перетаскивании)
- **`rowScrollArrow: 9`** — стрелки быстрого скролла к фазе строки

### Липкие элементы в контенте (10–39)
- **`stickyInContent: 10`** — липкие элементы внутри контента (например, карточки задач при скролле)
- **`stickyElevated: 20`** — повышенные липкие элементы
- **`stickyNote: 25`** — sticky-note комментарии (выше обычных карточек, чтобы реакции не перекрывались)
- **`arrowsHovered: 30`** — стрелки при наведении

### Chrome элементы (40–70)
- **`agentPendingApproval: 40`** — тулбар предложения агента под карточкой
- **`plannerLaneGlass: 45`** — «стекло» колонки исполнителей (выше карточек, ниже имён)
- **`stickyLeftColumn: 50`** — липкая левая колонка
- **`stickyPinnedRows: 55`** — закреплённые строки свимлейна
- **`stickyMainHeader: 60`** — липкая главная шапка (дни)
- **`sidebarResize: 65`** — ручка изменения размера сайдбара (выше шапки дней)
- **`plannerControls: 70`** — шапка планера с селектом (поверх скролла доски, ниже дропдаунов)

### Дропдауны и поповеры (100–199)
- **`dropdown: 100`** — базовый уровень дропдаунов
- **`dropdownContent: 110`** — содержимое дропдауна
- **`dropdownNested: 120`** — вложенные дропдауны

### Плавающие контролы (200–299)
- **`floatingControls: 200`** — плавающие элементы управления

### Глобальные оверлеи (1000+)
- **`dragPreview: 1200`** — превью при перетаскивании
- **`sidePanel: 1300`** — правый сайдер задачи и др. панели (выше drag, ниже контекстных меню)
- **`contextMenu: 1400`** — контекстное меню (поверх сайдеров, ниже модалок)
- **`submenu: 1410`** — подменю
- **`popupContent: 1420`** — содержимое всплывающих окон
- **`modalBackdrop: 2000`** — фон модального окна
- **`modal: 2001`** — модальное окно
- **`modalNestedBackdrop: 2010`** — фон вложенной модалки
- **`modalNested: 2011`** — вложенная модалка
- **`modalConfirmBackdrop: 2020`** — фон диалога подтверждения (поверх вложенных модалок)
- **`modalConfirm: 2021`** — диалог подтверждения
- **`tooltip: 2500`** — тултипы (выше меню и модалок: подсказки пунктов меню не должны прятаться под меню)
- **`toast: 2600`** — тосты (поверх модалок и тултипов)
- **`overlay: 3000`** — глобальные оверлеи (загрузка и т.д.)

## Способы использования

### 1. Через inline style

Используйте для динамических стилей или когда нужен прямой контроль:

```tsx
<div style={{ zIndex: ZIndex.modal }}>
  Модальное окно
</div>
```

### 2. Через className (Tailwind)

Используйте метод `ZIndex.class()` для генерации Tailwind классов (для inline-style без зависимости от генерации Tailwind есть также `ZIndex.value('modal')`):

```tsx
<div className={ZIndex.class('modal')}>
  Модальное окно
</div>
// Результат: className="z-[2001]"
```

Можно комбинировать с другими классами:

```tsx
<div className={`fixed inset-0 bg-black/50 ${ZIndex.class('modalBackdrop')}`}>
  Фон модального окна
</div>
```

## Примеры использования

### Модальное окно

```tsx
import { ZIndex } from '@/constants';

<Dialog.Portal>
  <Dialog.Overlay 
    className={`fixed inset-0 bg-black/50 ${ZIndex.class('modalBackdrop')}`} 
  />
  <Dialog.Content 
    className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${ZIndex.class('modal')}`}
  >
    Содержимое модального окна
  </Dialog.Content>
</Dialog.Portal>
```

### Тултип

```tsx
import { ZIndex } from '@/constants';

<div
  className={`fixed ${ZIndex.class('tooltip')} px-2 py-1 bg-gray-900 text-white rounded`}
  style={{
    top: `${position.top}px`,
    left: `${position.left}px`,
  }}
>
  Текст тултипа
</div>
```

### Превью при перетаскивании

```tsx
import { ZIndex } from '@/constants';

<div
  style={{
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    zIndex: ZIndex.dragPreview,
    pointerEvents: 'none',
  }}
>
  Превью перетаскиваемого элемента
</div>
```

### Липкая шапка

```tsx
import { ZIndex } from '@/constants';

<div style={{ zIndex: ZIndex.stickyMainHeader }}>
  Липкая шапка
</div>
```

### Дропдаун

```tsx
import { ZIndex } from '@/constants';

<div className={`absolute ${ZIndex.class('dropdownContent')} bg-white rounded-lg shadow-lg`}>
  Содержимое дропдауна
</div>
```

## Рекомендации

### ✅ Правильно

1. **Всегда используйте `ZIndex` из констант** — не задавайте z-index напрямую числами
2. **Выбирайте подходящий уровень** — используйте уровень, который соответствует назначению элемента
3. **Комбинируйте с другими классами** — `ZIndex.class()` можно использовать вместе с другими Tailwind классами
4. **Для модалок используйте порталы** — рендерите модальные окна в `document.body` через `createPortal`, чтобы избежать проблем с overflow и stacking context

```tsx
// ✅ Правильно: модалка в портале
const modalElement = <Modal />;
const ModalComponent = createPortal(modalElement, document.body);
```

### ❌ Неправильно

1. **Не используйте прямые числа** — избегайте `zIndex: 1000` или `className="z-[1000]"`
2. **Не создавайте новые уровни без необходимости** — сначала проверьте, есть ли подходящий существующий уровень
3. **Не смешивайте стили** — не используйте одновременно inline style и className для z-index

```tsx
// ❌ Неправильно: прямой z-index
<div style={{ zIndex: 2001 }}>Модальное окно</div>

// ❌ Неправильно: смешанные стили
<div 
  style={{ zIndex: ZIndex.modal }}
  className={ZIndex.class('modal')}
>
```

## Когда добавлять новый уровень

Добавляйте новый уровень в `constants/zIndex.ts` только если:

1. **Нет подходящего существующего уровня** — проверьте все доступные уровни
2. **Элемент требует уникального слоя** — должен быть выше или ниже определенных элементов
3. **Соблюдайте диапазоны** — новый уровень должен соответствовать логике диапазонов:
   - 0–9: базовый контент
   - 10–39: липкие элементы
   - 40–70: chrome элементы
   - 100–199: дропдауны
   - 200–299: плавающие контролы
   - 1000+: глобальные оверлеи

### Пример добавления нового уровня

```typescript
// constants/zIndex.ts
const levels = {
  // ... существующие уровни
  newElement: 150, // в диапазоне дропдаунов (100–199)
} as const;
```

## Типизация

Аргумент `ZIndex.class()` / `ZIndex.value()` типизирован ключами `levels` (локальный тип `ZIndexLevel` в `constants/zIndex.ts`, наружу не экспортируется) — TypeScript предупредит, если вы используете несуществующий уровень.

## CSS переменные

В `app/globals.css` определены CSS переменные для части уровней (`--z-dropdown*`, `--z-tooltip`, `--z-toast`, `--z-drag-preview`, `--z-side-panel`, `--z-context-menu`, `--z-submenu`, `--z-popup-content`, `--z-modal*`) — для CSS-правил (тултипы, выпадающие меню). В TSX используйте `ZIndex` из констант:

```css
:root {
  --z-tooltip: 2500; /* = ZIndex.tooltip */
  --z-toast: 2600;   /* = ZIndex.toast */
  --z-modal: 2001;
  /* ... */
}
```

Расхождение: `--z-overlay: 1100` в `globals.css` не совпадает с `ZIndex.overlay: 3000`; переменная в CSS сейчас не используется.

## Отладка

Если элементы перекрываются неправильно:

1. **Проверьте уровень z-index** — убедитесь, что используется правильный уровень из `ZIndex`
2. **Проверьте stacking context** — `position: relative/absolute/fixed` создает новый stacking context
3. **Проверьте порталы** — модалки должны рендериться в `document.body`
4. **Используйте DevTools** — в Chrome DevTools можно увидеть все z-index значения в Computed стилях

## Связанные файлы

- `constants/zIndex.ts` — определение всех уровней z-index
- `app/globals.css` — CSS переменные (legacy)
- `components/ConfirmDialog.tsx` — пример использования для модалок (`modalConfirmBackdrop` / `modalConfirm`)
- `components/TextTooltipPortalContent.tsx` — пример использования для тултипов
- `components/AppToaster.tsx` — тосты
