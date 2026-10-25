# Именование папок (домены и компоненты)

В проекте есть несколько стилей имён папок. Ниже — зафиксированное правило, чтобы снять разногласия.

## Правило

**Папки-домены (группировка по подфичам/областям):** **kebab-case**  
Примеры: `context-menu`, `sla-bugs`, `sprint-metrics` (корень `features/`), `task-arrows`, `in-progress-fact` (`features/swimlane/components/`, `features/swimlane/utils/`), `feature-lanes` (`features/sprint/components/SprintPlanner/`).

**Папки-компоненты** (одна главная сущность + её части, совпадает с именем React-компонента): **PascalCase** (`TaskCard`, `TaskBar`, `SprintPlanner`, `DaysHeader`, `ContextMenu`, `BugsTab`). Так и оставляем: папка рядом с одноимённым файлом или главным компонентом внутри.

**Технические папки:** lowercase (`components`, `hooks`, `utils`, `contexts`, `constants`) и короткие lowercase-группы внутри модуля (`board`, `kanban`, `layout`, `mobx`, `onboarding`).

**Итог:** для разделения на домены/поддомены в `features/` — **kebab-case**; для папки одного компонента — **PascalCase**. Массово старые папки не переименовываем.

## Текущее состояние

| Где | Стиль | Примеры |
|-----|--------|--------|
| `features/` (корень) | kebab-case / одно слово | `context-menu`, `sla-bugs`, `sprint-metrics`, `swimlane`, `retro` |
| Технические папки | lowercase | `components`, `hooks`, `utils`, `contexts` |
| Поддомены внутри фич | kebab-case | `task-arrows`, `in-progress-fact`, `feature-lanes` |
| Папки компонентов | PascalCase | `TaskCard`, `TaskInfoSidebar`, `SprintPlanner`, `DaysHeader`, `AccountWorkModal` |
| Папки хука/модуля с частями | camelCase по имени модуля | `features/swimlane/hooks/useDragAndDrop/`, `features/task/utils/autoAssignTasks/` |
| `lib/` (домены) | camelCase / одно слово | `sprintGoals`, `slaBugs`, `agentSessions`, `retro`; исключение — `planner-timeline` |

При рефакторинге или добавлении новых доменов в `features/` ориентируемся на kebab-case.
