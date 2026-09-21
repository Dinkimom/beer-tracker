/**
 * Единая система цветов для статусов задач
 * Используется во всех компонентах для консистентности
 */

import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';

import {
  resolveResizeHandleColors,
  resolveResizeHandleHoverBgClass,
} from './statusColorsHelpers';

export { resolveResizeHandleHoverBgClass };
import {
  DEFAULT_COLORS,
  PHASE_DIVIDER_CLASSES,
  STATUS_COLOR_MAP,
  type StatusColorGroup,
} from './statusColorsMap';

export type { StatusColorGroup };

/** Нормализует ключ статуса для поиска в мапе (как в Kanban: lowercase, без пробелов/подчёркиваний/дефисов). */
export function normalizeStatusKey(status: string): string {
  return (status || '').toLowerCase().replace(/[\s_-]/g, '').trim();
}

/** Ключ палитры: приоритет у override из интеграции (visualToken), иначе ключ статуса трекера. */
export function resolvePaletteStatusKey(
  originalStatus: string | undefined,
  paletteKeyOverride: string | undefined
): string | undefined {
  const o = paletteKeyOverride?.trim();
  if (o) {
    return o;
  }
  return originalStatus;
}

/** Статус для палитры карточки/фазы: при монохроме — как у бэклога */
export function resolveStatusForPhaseCardColors(
  scheme: PlanningPhaseCardColorScheme,
  originalStatus?: string,
  paletteKeyOverride?: string
): string | undefined {
  if (scheme === 'monochrome') {
    return 'backlog';
  }
  return resolvePaletteStatusKey(originalStatus, paletteKeyOverride);
}

/** Hex цвета стрелок связей (свимлейн, занятость): та же схема, что у карточек и фаз */
export function getPhaseLinkArrowDefaultHex(
  scheme: PlanningPhaseCardColorScheme,
  originalStatus?: string,
  paletteKeyOverride?: string
): string {
  const statusKey = resolveStatusForPhaseCardColors(scheme, originalStatus, paletteKeyOverride);
  return getStatusColors(statusKey).arrow.default;
}

/**
 * Монохром: граница как у бэклога (с пунктиром) только для статуса «Бэклог», иначе сплошная, те же оттенки.
 */
export function getMonochromeBorderParts(
  originalStatus?: string
): Pick<StatusColorGroup, 'border' | 'borderDark'> {
  const backlog = getStatusColors('backlog');
  const isBacklog =
    originalStatus != null &&
    originalStatus !== '' &&
    normalizeStatusKey(originalStatus) === 'backlog';
  if (isBacklog) {
    return { border: backlog.border, borderDark: backlog.borderDark };
  }
  const border = backlog.border.replace(/\bborder-dashed\b/g, '').trim();
  return { border, borderDark: backlog.borderDark };
}

/** Классы границы для карточки (swimlane/sidebar): border + borderDark одной строкой */
export function getMonochromeCardBorderClasses(originalStatus?: string): string {
  const { border, borderDark } = getMonochromeBorderParts(originalStatus);
  return [border, borderDark ?? ''].filter(Boolean).join(' ').trim();
}

export function getStatusColors(status?: string): StatusColorGroup {
  if (!status) return DEFAULT_COLORS;
  return STATUS_COLOR_MAP[normalizeStatusKey(status)] || DEFAULT_COLORS;
}

/**
 * Классы компактного превью «как карточка в свимлейне»: bg + border из той же схемы, что `getTaskCardStyles` (swimlane, status).
 */
export function getSwimlaneTaskCardChipClassNames(statusKey: string): string {
  const c = getStatusColors(statusKey?.trim());
  return [
    'inline-block h-5 w-9 shrink-0 rounded-lg border-2',
    c.bg,
    c.bgDark,
    c.border,
    c.borderDark,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Есть ли у нормализованного ключа своя запись в STATUS_COLOR_MAP (не fallback DEFAULT). */
export function isKnownStatusPaletteKey(status?: string): boolean {
  if (!status?.trim()) {
    return false;
  }
  return normalizeStatusKey(status) in STATUS_COLOR_MAP;
}

/** Ключи палитры для админки (маппинг visualToken → цвет карточки/фазы). */
export function listStatusPaletteKeys(): string[] {
  return Object.keys(STATUS_COLOR_MAP).sort((a, b) => a.localeCompare(b));
}

/**
 * Админка: один ключ на каждый уникальный вид чипа карточки (меньше дублей вроде двух «Серый»).
 */
export function listDistinctStatusPaletteKeys(): string[] {
  const keys = listStatusPaletteKeys();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const sig = getSwimlaneTaskCardChipClassNames(k);
    if (seen.has(sig)) {
      continue;
    }
    seen.add(sig);
    out.push(k);
  }
  return out;
}

/** Канонический ключ палитры: тот же вид чипа → один сохранённый ключ (порядок как в listStatusPaletteKeys). */
export function canonicalPaletteKey(paletteKey: string): string {
  const raw = paletteKey.trim();
  if (!raw) {
    return '';
  }
  const k = normalizeStatusKey(raw);
  if (!(k in STATUS_COLOR_MAP)) {
    return raw;
  }
  const sig = getSwimlaneTaskCardChipClassNames(k);
  for (const c of listStatusPaletteKeys()) {
    if (getSwimlaneTaskCardChipClassNames(c) === sig) {
      return c;
    }
  }
  return k;
}

/**
 * Русское имя «семейства» цвета палитры (админка интеграции).
 */
const STATUS_PALETTE_COLOR_FAMILY_RU: Record<string, string> = {
  backlog: 'Белый',
  readyfordevelopment: 'Серый',
  transferredtodevelopment: 'Серый',
  inprogress: 'Синий',
  review: 'Розовый',
  inreview: 'Розовый',
  defect: 'Красный',
  blocked: 'Красный',
  readyfortest: 'Оранжевый',
  readyfortesting: 'Оранжевый',
  intesting: 'Жёлтый',
  rc: 'Фиолетовый',
  closed: 'Зелёный',
  brown: 'Коричневый',
};

export function getStatusPaletteRuLabel(paletteKey: string): string {
  const raw = paletteKey.trim();
  if (!raw) {
    return '';
  }
  const k = normalizeStatusKey(raw);
  return STATUS_PALETTE_COLOR_FAMILY_RU[k] ?? 'Серый';
}

/**
 * Создает CSS стиль для полосатого паттерна QA задач
 * Возвращает светлую версию, темная версия применяется в компоненте TaskCard
 */
export function getQAStripedPattern(status?: string): React.CSSProperties | undefined {
  const colors = getStatusColors(status);
  // Неизвестный статус → DEFAULT без qaStriped; оранжевый readyfortest вводил в заблуждение (бейдж серый, фон «к тесту»).
  const basePattern = colors.qaStriped ?? getStatusColors('backlog').qaStriped;
  if (!basePattern) return undefined;

  return {
    backgroundImage: `repeating-linear-gradient(
      45deg,
      ${basePattern.base},
      ${basePattern.base} 10px,
      ${basePattern.stripe} 10px,
      ${basePattern.stripe} 20px
    )`,
  };
}

/**
 * Общий хелпер для получения полосатого стиля QA и базового цвета
 * с учётом темы (светлая/тёмная) и fallback статуса.
 */
export function getQaStripedStyles(
  status: string | undefined,
  isDark: boolean
): { style?: React.CSSProperties; baseColor?: string } {
  const colors = getStatusColors(status);

  // Для тёмной темы — qaStripedDark; без него нейтральный бэклог, не «готово к тесту» (оранжевый).
  const darkPattern = colors.qaStripedDark ?? getStatusColors('backlog').qaStripedDark;
  if (isDark && darkPattern) {
    return {
      style: {
        backgroundImage: `repeating-linear-gradient(
          45deg,
          ${darkPattern.base},
          ${darkPattern.base} 10px,
          ${darkPattern.stripe} 10px,
          ${darkPattern.stripe} 20px
        )`,
      },
      baseColor: darkPattern.base,
    };
  }

  // Для светлой темы используем getQAStripedPattern (он уже умеет fallback'иться)
  const lightStyle = getQAStripedPattern(status);
  const lightSource = colors.qaStriped ?? getStatusColors('backlog').qaStriped;

  return {
    style: lightStyle,
    baseColor: lightSource?.base,
  };
}

/**
 * Получает цвет для превью границы при расширении задачи
 * Для QA задач применяется маппинг статусов
 */
export function getPreviewBorderColor(status: string | undefined, isQATask: boolean): string {
  if (!status) return DEFAULT_COLORS.previewBorder;

  const normalizedStatus = status.toLowerCase();

  // Для QA задач некоторые статусы маппятся
  if (isQATask && (normalizedStatus === 'review' || normalizedStatus === 'inreview')) {
    return getStatusColors('backlog').previewBorder;
  }

  return getStatusColors(status).previewBorder;
}

/**
 * Получает цвета для resize handle (свимлейн, занятость).
 * `scheme === 'monochrome'` — как у бэклога; иначе по статусу и маппингу QA (review/inreview → бэклог).
 */
export function getResizeHandleColors(
  status: string | undefined,
  isQATask: boolean,
  scheme: PlanningPhaseCardColorScheme = 'status'
) {
  return resolveResizeHandleColors(status, isQATask, scheme);
}

const DEFAULT_DIVIDER_CLASSES = 'bg-gray-300 dark:bg-gray-600';

/**
 * Классы фона для разделителя «оценка / доп» в фазе (тот же цвет, что граница по статусу).
 * Учитывает маппинг статусов для QA, как getResizeHandleColors.
 * Использует явный маппинг PHASE_DIVIDER_CLASSES, чтобы классы не выкидывались Tailwind.
 */
export function getPhaseDividerClasses(status?: string, isQa?: boolean): string {
  if (!status) return DEFAULT_DIVIDER_CLASSES;
  const normalized = normalizeStatusKey(status);
  let lookupKey: string;
  if (isQa && (normalized === 'review' || normalized === 'inreview')) {
    lookupKey = 'backlog';
  } else {
    lookupKey = normalized;
  }
  return PHASE_DIVIDER_CLASSES[lookupKey] ?? DEFAULT_DIVIDER_CLASSES;
}
