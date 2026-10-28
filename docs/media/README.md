# Медиа для README

Слоты под скриншоты и анимации для посадочной [`README.md`](../../README.md). Источник живых кадров — [`/demo/planner`](http://localhost:3000/demo/planner).

| Файл | Что | Источник |
|------|-----|----------|
| `logo-button-light.png` / `logo-button-dark.png` | Бренд без фона: две кружки из `public/assets/beer-emoji.json` и Caveat, цвет текста под тему | кадр покоя лотти шапки |
| `backlog-light.webp` / `backlog-dark.webp` | Бэклог | Backlog |
| `burndown-light.webp` / `burndown-dark.webp` | Burndown SP/TP | Burndown |
| `metrics-light.webp` / `metrics-dark.webp` | Метрики по кварталам | Metrics |
| `fact-timeline-light.webp` / `fact-timeline-dark.webp` | Таймлайн факта под дорожками | Board, настройка «Таймлайн факта» |
| `collaboration-light.webp` / `collaboration-dark.webp` | Presence: стек в шапке и аватары на карточках | Board |
| `drag-resize-light.webp` / `drag-resize-dark.webp` | Анимация: перенос карточки к другому человеку и смена длительности | Board |
| `link-light.webp` / `link-dark.webp` | Анимация: связь задач инструментом Link | Board |
| `note-light.webp` / `note-dark.webp` | Анимация: заметка с чеклистом | Board, инструмент Note |
| `retro-light.webp` / `retro-dark.webp` | Анимация: карточки в колонках ретро | Retro |

Демо-участники (имена + портреты Wikimedia в [`public/demo/avatars/`](../../public/demo/avatars/)): Linus Torvalds, Guido van Rossum, Margaret Hamilton, John Carmack, Ken Thompson.

## Как обновить скрины

Скилл [`landing-docs`](../../.claude/skills/landing-docs/SKILL.md) (`/landing-docs` в Claude Code) снимает скрины (`capture.cjs`) и записывает анимации (`record.cjs`) скриптами, сверяет текст посадочной с продуктом и прогоняет его через humanizer. Вручную:

1. `pnpm docker:dev` → [http://localhost:3000/demo/planner](http://localhost:3000/demo/planner)
2. Язык интерфейса — английский (кадры на посадочной в одном языке). Светлая / тёмная тема в шапке; вкладки Board / Backlog / Burndown / Retro
3. Закройте сайдбар и онбординг, кадр 1680×1050 @2x, ужатый до 1800 px в ширину → соответствующие `*-light.webp` / `*-dark.webp` в этой папке. Факт — с включённым «Таймлайн факта под свимлейном».

Анимации вручную не пишутся: сценарии (жесты мыши, набор текста) описаны в `record.cjs`.

## Светлая / тёмная в README

В GitHub README нет кликабельных табов (JS/CSS режется). Пары скринов подключаются через `<picture>` + `prefers-color-scheme`: показывается версия под тему GitHub (Appearance → Theme). Оба файла пары остаются в репо.

## Рекомендации

- Ширина файла 1800 px: в README `width="900"`, ×2 для ретины. Больше не нужно: GitHub режет `loading="lazy"`, все картинки страницы грузятся сразу, и лишние пиксели — это секунды до первого контента.
- Демо-фикстуры без личных данных и реальных ключей задач.
- Анимации — анимированный WebP 1800×1125, 5–15 с, не больше 25 кадров/с, до ~1 MB на файл. GitHub показывает его как картинку; GIF там тоже работает, но это 256 цветов (полосы на градиентах UI) и в разы больший вес.
