/**
 * Статическая сборка демо для GitHub Pages (`scripts/demo-pages/`, workflow `demo-pages.yml`).
 *
 * Там нет сервера: ни `/api/*`, ни proxy, ни сессии. Сайт живёт под подпутём
 * (`https://dinkimom.github.io/beer-tracker/`), поэтому пути к файлам из `public/` идут через
 * {@link publicAssetPath} — `basePath` Next сам их не переписывает. Оба значения задаёт
 * `next.config.ts` при `BEER_TRACKER_STATIC_DEMO=1`; в обычной сборке флаг выключен, префикс пустой.
 */
export const IS_STATIC_DEMO_BUILD = process.env.NEXT_PUBLIC_STATIC_DEMO === '1';

/** Путь к файлу из `public/` (начинается с `/`) с учётом `basePath` статической демо-сборки. */
export function publicAssetPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}
