# Медиа для README

Слоты под скриншоты и GIF для посадочной [`README.md`](../../README.md). Источник живых кадров — [`/demo/planner`](http://localhost:3000/demo/planner).

| Файл | Что | Источник |
|------|-----|----------|
| `logo-button-light.png` / `logo-button-dark.png` | Бренд без фона: две кружки из `public/assets/beer-emoji.json` и Caveat, цвет текста под тему | кадр покоя лотти шапки |
| `swimlane-light.png` / `swimlane-dark.png` | Свимлейны | Board, сайдбар закрыт |
| `backlog-light.png` / `backlog-dark.png` | Бэклог | Backlog |
| `burndown-light.png` / `burndown-dark.png` | Burndown SP/TP | Burndown |
| `retro-light.png` / `retro-dark.png` | Ретро + «Факты» | Retro |
| `fact-timeline-light.png` / `fact-timeline-dark.png` | Таймлайн факта под дорожками | Board, настройка «Таймлайн факта» |
| `collaboration-light.png` / `collaboration-dark.png` | Presence: стек в шапке и аватары на карточках | Board |

Демо-участники (имена + портреты Wikimedia в [`public/demo/avatars/`](../../public/demo/avatars/)): Linus Torvalds, Guido van Rossum, Margaret Hamilton, John Carmack.

## Как обновить скрины

1. `pnpm docker:dev` → [http://localhost:3000/demo/planner](http://localhost:3000/demo/planner)
2. Язык интерфейса — английский (кадры на посадочной в одном языке). Светлая / тёмная тема в шапке; вкладки Board / Backlog / Burndown / Retro
3. Закройте сайдбар и онбординг, кадр ~1680×1050 → соответствующие `*-light.png` / `*-dark.png` в этой папке. Факт — с включённым «Таймлайн факта под свимлейном».

## Светлая / тёмная в README

В GitHub README нет кликабельных табов (JS/CSS режется). Пары скринов подключаются через `<picture>` + `prefers-color-scheme`: показывается версия под тему GitHub (Appearance → Theme). Оба файла (`*-light.png` / `*-dark.png`) остаются в репо.

## Рекомендации

- Ширина ~1200–1600 px; в README обычно `width="900"`.
- Демо-фикстуры без личных данных и реальных ключей задач.
- GIF: 3–8 с; вес желательно &lt; 5–8 MB.
