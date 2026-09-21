/**
 * Иерархия z-index по слоям (снизу вверх).
 * Импорт: `import { ZIndex } from '@/constants'`
 * - style: `style={{ zIndex: ZIndex.modal }}`
 * - className: `className={ZIndex.class('modal')}` → `z-[2001]`
 *
 * Слои:
 * 0–9     — базовый контент (стрелки под карточками, слои задач)
 * 10–39   — липкие элементы в контенте, стрелки при hover
 * 40–69   — chrome: колонки, шапка
 * 100–199 — дропдауны, поповеры (контент выше backdrop)
 * 200–299 — плавающие контролы
 * 1000+   — глобальные оверлеи: тултипы, загрузка, drag, меню, модалки
 */
const levels = {
  base: 0,
  contentOverlay: 1,
  contentInteractive: 2,
  /** Бейзлайн поверх полос фаз, чтобы был виден при перетаскивании */
  baselineOverBar: 3,
  stickyInContent: 10,
  stickyElevated: 20,
  /** Sticky-note комментарии: выше обычных/error-карточек, чтобы реакции не перекрывались */
  stickyNote: 25,
  arrowsHovered: 30,
  /** Стрелки быстрого скролла к фазе строки: выше контента фазы; ниже sticky-строк эпика/стори (tbody z-30), chrome */
  rowScrollArrow: 9,
  stickyLeftColumn: 50,
  /** Закреплённые строки свимлейна: выше левой колонки обычных строк, ниже шапки дат */
  stickyPinnedRows: 55,
  stickyMainHeader: 60,
  /**
   * Resize-хендл сайдбара планера: выше sticky-шапки дней (иначе обрезает hit-area
   * на стыке board | sidebar). Ниже dropdown (100).
   */
  sidebarResize: 65,
  dropdown: 100,
  dropdownContent: 110,
  dropdownNested: 120,
  floatingControls: 200,
  tooltip: 1000,
  dragPreview: 1200,
  /** Правый сайдер задачи и др. панели: выше drag, ниже контекстных меню. */
  sidePanel: 1300,
  /** Контекстное меню и подменю: поверх сайдеров, ниже модалок. */
  contextMenu: 1400,
  submenu: 1410,
  popupContent: 1420,
  modalBackdrop: 2000,
  modal: 2001,
  /** Поверх обычной модалки (второй уровень: форма внутри модалки). */
  modalNestedBackdrop: 2010,
  modalNested: 2011,
  /** Подтверждение поверх любой модалки, в том числе вложенной. */
  modalConfirmBackdrop: 2020,
  modalConfirm: 2021,
  overlay: 3000,
} as const;

type ZIndexLevel = keyof typeof levels;

export const ZIndex = {
  ...levels,
  /** Класс Tailwind для z-index. В className: `ZIndex.class('modal')` → `z-[2001]` */
  class: (level: ZIndexLevel): string => `z-[${levels[level]}]`,
  /** Числовое значение z-index (для inline-style — чтобы не зависеть от Tailwind генерации). */
  value: (level: ZIndexLevel): number => levels[level],
};
