# Аудит дублирующих компонентов

> **Исторический документ.** Аудит проводился в феврале 2025, рекомендации внедрены. Большинство файлов из исходного аудита с тех пор удалены или переименованы (`SidebarFilters`, `TasksSidebar`, `TaskSidebarCard`, `TaskBadges`, `TaskDetailsPanel`, `GroomingTab`, `PhaseEditModal`, `DraftTaskModal`, `AutoPlanModal` и др.), поэтому их построчный список здесь не ведётся. Ниже — текущее состояние общих примитивов (сверено с кодом 2026-10-25).

---

## Общие примитивы в `components/`

| Паттерн из аудита | Текущее состояние |
|-------------------|-------------------|
| Поле поиска с иконкой и «×» | [`components/SearchInput.tsx`](../components/SearchInput.tsx) (тест `SearchInput.test.tsx`). Используется в `TasksTabFilters`, `BacklogPageFilters`, `SprintPlannerControlsBarLeftSection`, `AdminMembersPageClient`, `QuickAddMenuExistingPanel`, `StickyNoteReactionPicker`. |
| Бейджи SP/TP (`PointBadge`) | Компонент удалён как мёртвый код (`38220873`, 2026-03-27). Отдельного общего бейджа очков сейчас нет. |
| Тег команды (`TeamTag`, `getTeamTagClasses`) | `TeamTag` удалён (`38220873`). Маппинг «команда → классы» остался в [`utils/teamColors.ts`](../utils/teamColors.ts) (`TEAM_TAG_BG`, `TEAM_TAG_BORDER`, `getTeamTagClasses`); единственный потребитель — `components/Avatar.tsx`. |
| Тег статуса | [`components/StatusTag.tsx`](../components/StatusTag.tsx) — используется в карточке задачи (`TaskCardTagsSidebarRow`, `TaskCardSlotItem`), бэклоге, свимлейне, `TaskStatusSelect`, `SprintStatusTag`, `TransitionFieldsModal`, `TaskInfoSidebarTransitions`. |
| Текстовые поля | [`components/Input.tsx`](../components/Input.tsx), [`components/TextArea.tsx`](../components/TextArea.tsx), [`components/PasswordInput.tsx`](../components/PasswordInput.tsx). |
| Кастомный селект | [`components/CustomSelect.tsx`](../components/CustomSelect.tsx) (+ `CustomSelectMenu`, `CustomSelectOptionsList`, `CustomSelectTrigger`). Отдельного `components/Select.tsx` нет; нативные `<select>` в UI не используются. |
| Вторичные кнопки | [`components/Button.tsx`](../components/Button.tsx) (`variant`: `primary` / `secondary` / …), сториз `Button.stories.tsx`. Иконочные кнопки шапки — [`components/HeaderIconButton.tsx`](../components/HeaderIconButton.tsx). |

Карточки задач по-прежнему не объединяются в один компонент: основная — [`features/task/components/TaskCard/`](../features/task/components/TaskCard/); отдельной карточки планировщика фич больше нет (`features/feature-planner/` удалён).

---

## Открытое

- Общего бейджа SP/TP и тега команды нет — при появлении дублирования вводить заново в `components/`, а не возвращать старые файлы.
- Перед новым атомом UI — поиск в `components/` (см. раздел «Дизайн-система» в [`AGENTS.md`](../AGENTS.md)).
