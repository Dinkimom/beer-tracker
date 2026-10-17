# Компании

Кто уже ведёт спринты в Beer Tracker. На посадочной компания показывается логотипом.

Новая компания — три шага, в одном порядке:

1. Строка в таблице ниже.
2. Два файла: `docs/media/companies/<id>-light.svg` для светлой темы и `<id>-dark.svg` для тёмной. Тёмная версия — тот же знак, тёмные части заменены на белый, фирменный акцент остаётся.
3. Блок `adopters` в [README.md](../README.md) и [README.en.md](../README.en.md). Тот же порядок, что в таблице. Высота 40. Следующий логотип — ещё один `<a>` в том же абзаце.

| id | Компания | Сайт |
|----|----------|------|
| yclients | YCLIENTS | https://www.yclients.com |

```html
<a href="https://www.yclients.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/companies/yclients-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/companies/yclients-light.svg" />
    <img src="./docs/media/companies/yclients-light.svg" alt="YCLIENTS" height="40" />
  </picture>
</a>
```
