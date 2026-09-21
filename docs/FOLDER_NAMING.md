# Именование папок (домены и компоненты)

В проекте есть два стиля имён папок. Ниже — зафиксированное правило, чтобы снять разногласия.

## Правило

**Папки-домены (группировка по подфичам/областям):** **kebab-case**  
Примеры: `task-row`, `quarterly-planning`, `feature-planner`, `context-menu`, `task-row`, `actual`, `availability`, `shared`, `table`, `task-arrows`, `other`.

**Папки-компоненты** (одна главная сущность + её части, часто совпадает с именем React-компонента): в старом коде местами **PascalCase** (например `Phase`, `Task`, `Timeline`, `TaskBoard`, `CommentCard`). **Для новых таких папок** предпочтительно **kebab-case** в духе доменов, если это именно группировка по области, а не «одна папка = один компонент».

**Итог:** для **разделения на домены/поддомены** везде используем **kebab-case**. Так сделано в `occupancy/components` (actual, availability, shared, table, task-row, task-arrows, other), в `features/swimlane/components` (`task-arrows`, `in-progress-fact`) и в корне фич (quarterly-planning, feature-planner). Старые папки в PascalCase (Phase, Task, Availability в quarterly-planning и т.п.) можно не переименовывать массово; при добавлении новых доменов — kebab-case.

## Текущее состояние

| Где | Стиль | Примеры |
|-----|--------|--------|
| Фичи (корень) | kebab-case | `quarterly-planning`, `feature-planner`, `context-menu` |
| Технические папки | lowercase | `components`, `hooks`, `utils`, `services` |
| occupancy/components (домены) | kebab-case | `task-row`, `table`, `actual`, `availability`, `shared`, `task-arrows`, `other` |
| quarterly-planning/components | PascalCase (исторически) | `Phase`, `Task`, `Quarter`, `Timeline`, `Availability`, `Participants` |
| Другие фичи (папки под компоненты) | PascalCase (исторически) | `TaskBoard`, `CommentCard`, `SprintPlanner`, `DaysHeader` |

При рефакторинге или добавлении новых доменов ориентируемся на kebab-case для доменной группировки.
