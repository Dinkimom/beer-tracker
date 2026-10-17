# Медиа для README

Слоты под скриншоты и GIF для посадочной [`README.md`](../../README.md). Источник живых кадров — [`/demo/planner`](http://localhost:3000/demo/planner).

| Файл | Что | Источник |
|------|-----|----------|
| `logo-button-light.svg` / `logo-button-dark.svg` | Бренд без фона (кружка + Caveat), цвет текста под тему | сгенерировано из `beer-mug.svg` + Caveat Bold |
| `swimlane-light.png` / `swimlane-dark.png` | Свимлейны | Board |
| `backlog-light.png` / `backlog-dark.png` | Бэклог | Backlog |
| `burndown-light.png` / `burndown-dark.png` | Burndown SP/TP | Burndown |
| `retro-light.png` / `retro-dark.png` | Ретро + «Факты» | Retro |
| `fact-timeline.svg` → `.png` | Таймлайн факта | Живой планер после sync |
| `collaboration.svg` → `.png` | Presence | Живой планер (2+ вкладки) |

Демо-участники (имена + портреты Wikimedia в [`public/demo/avatars/`](../../public/demo/avatars/)): Linus Torvalds, Guido van Rossum, Margaret Hamilton, John Carmack.

## Как обновить скрины

1. `pnpm docker:dev` → [http://localhost:3000/demo/planner](http://localhost:3000/demo/planner)
2. Светлая / тёмная тема в шапке; вкладки Board / Backlog / Burndown / Retro
3. Кадр ~1440×900 → соответствующие `*-light.png` / `*-dark.png` в этой папке

## Светлая / тёмная в README

В GitHub README нет кликабельных табов (JS/CSS режется). Пары скринов подключаются через `<picture>` + `prefers-color-scheme`: показывается версия под тему GitHub (Appearance → Theme). Оба файла (`*-light.png` / `*-dark.png`) остаются в репо.

## Рекомендации

- Ширина ~1200–1600 px; в README обычно `width="900"`.
- Демо-фикстуры без личных данных и реальных ключей задач.
- GIF: 3–8 с; вес желательно &lt; 5–8 MB.
