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
| Модальное окно | [`components/Modal.tsx`](../components/Modal.tsx) — одна оболочка на Radix Dialog: затемнение, заголовок с пояснением, прокручиваемое содержимое, кнопки внизу (`footer`), Escape. Новое окно — только через неё; подтверждение действия — `useConfirmDialog`. Состояния — в `Modal.stories.tsx`. На ней все окна приложения: завершение спринта, выбор статуса на канбане, учёт работы, поля перехода, создание спринта, отображение карточки, обрезка фото, формы админки, диалоги роадмэпа и настройки (режим `bare`: своя шапка с вкладками и сменные экраны — `SettingsSubPanel`). Проп `busy` не даёт закрыть окно, пока идёт операция. Кнопки формы стоят в `footer` — [`components/ModalFormActions.tsx`](../components/ModalFormActions.tsx) («Отмена» и главное действие, привязанное к форме по `formId`). Свой портал внутри окна (не Radix) помечается `OVERLAY_CHILD_ATTR` из `components/overlayChild.ts` — иначе клик по нему закроет окно. |
| Поповер без своего триггера | [`components/AnchoredPopover.tsx`](../components/AnchoredPopover.tsx) — стеклянная панель у точки клика или прямоугольника элемента на Radix Popover: сама уходит вверх или вбок, клик мимо и Escape закрывают, доска под ней не кликается. На ней меню роадмэпа, выбор исполнителя, настройки участников и строк фич. Состояния — `AnchoredPopover.stories.tsx`. Поповер у кнопки-триггера — обычный Radix Popover (`CustomSelect`, пикеры дат). |
| Вторичные кнопки | [`components/Button.tsx`](../components/Button.tsx) (`variant`: `primary` / `secondary` / …), сториз `Button.stories.tsx`. Иконочные кнопки шапки — [`components/HeaderIconButton.tsx`](../components/HeaderIconButton.tsx). |

Карточки задач по-прежнему не объединяются в один компонент: основная — [`features/task/components/TaskCard/`](../features/task/components/TaskCard/); отдельной карточки планировщика фич больше нет (`features/feature-planner/` удалён).

---

## Открытое

- Общего бейджа SP/TP и тега команды нет — при появлении дублирования вводить заново в `components/`, а не возвращать старые файлы.
- Перед новым атомом UI — поиск в `components/` (см. раздел «Дизайн-система» в [`AGENTS.md`](../AGENTS.md)).
