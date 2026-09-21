import type { CSSProperties } from 'react';

interface PhotoCardPaint {
  background: string;
  caption: string;
  shadow: string;
}

interface PhotoCardResizeHandlePaint {
  activeBackground: string;
  hoverBackground: string;
  line: string;
}

const PHOTO_PAINT_LIGHT: PhotoCardPaint = {
  background: '#f6f5f2',
  caption: '#4a4f54',
  shadow: '3px 10px 22px rgba(20, 24, 28, 0.2), 0 1px 2px rgba(20, 24, 28, 0.1)',
};

const PHOTO_PAINT_DARK: PhotoCardPaint = {
  background: '#2c3034',
  caption: '#d8dce0',
  shadow: '3px 12px 26px rgba(0, 0, 0, 0.52), 0 1px 2px rgba(0, 0, 0, 0.32)',
};

function getPhotoCardPaint(isDark = false): PhotoCardPaint {
  return isDark ? PHOTO_PAINT_DARK : PHOTO_PAINT_LIGHT;
}

export function getPhotoCardStyle(isDark = false): CSSProperties {
  const paint = getPhotoCardPaint(isDark);
  return {
    backgroundColor: paint.background,
    borderColor: 'transparent',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: 0,
    boxShadow: paint.shadow,
    color: paint.caption,
  };
}

export function getPhotoCardCaptionColor(isDark = false): string {
  return getPhotoCardPaint(isDark).caption;
}

export function getPhotoCardDeleteButtonStyle(isDark = false): CSSProperties {
  const paint = getPhotoCardPaint(isDark);
  return {
    backgroundColor: paint.background,
    borderColor: isDark ? '#5c6368' : '#d0cec8',
    color: paint.caption,
  };
}

/** Превью постановки фото: паспарту и пунктир, без скругления. */
export function getPhotoCardDashedGhostStyle(isDark = false): CSSProperties {
  const paint = getPhotoCardPaint(isDark);
  return {
    backgroundColor: paint.background,
    borderColor: isDark ? '#5c6368' : '#d0cec8',
    borderRadius: 0,
    borderStyle: 'dashed',
    borderWidth: 2,
    boxShadow: 'none',
    color: paint.caption,
  };
}

/**
 * Inline-цвета рукоятки ресайза: нейтральные чернила паспарту, читаемы на #f6f5f2 и на чёрном колодце.
 */
export function getPhotoCardResizeHandlePaint(isDark = false): PhotoCardResizeHandlePaint {
  if (isDark) {
    return {
      hoverBackground: 'rgba(255, 255, 255, 0.22)',
      activeBackground: 'rgba(255, 255, 255, 0.42)',
      line: 'rgba(255, 255, 255, 0.88)',
    };
  }
  return {
    hoverBackground: 'rgba(20, 24, 28, 0.22)',
    activeBackground: 'rgba(20, 24, 28, 0.4)',
    line: 'rgba(246, 245, 242, 0.95)',
  };
}

export function getPhotoCardSurfaceClasses(): string {
  return '!rounded-none overflow-visible shadow-none';
}

export function getPhotoCardPaddingClass(_hasFooter = false): string {
  return '!p-2.5';
}

/** Нижний отступ выше компактной рукоятки ресайза (h-4), чтобы подпись не перехватывала жест. */
export function getPhotoCardCaptionClass(): string {
  return 'mt-2 mb-3 block w-full shrink-0 truncate px-0.5 text-center font-sans text-[10px] font-medium leading-tight tracking-wide';
}

export function getPhotoCardWellClass(): string {
  return 'relative min-h-0 flex-1 overflow-hidden bg-black';
}

export function getPhotoCardEmptySlotClass(): string {
  return 'flex h-full w-full items-center justify-center px-1 text-center font-sans text-[10px] leading-tight text-white/80';
}

/** Колодец схемы без чёрного паспарту — фон задаётся цветом сцены. */
export function getDiagramCardWellClass(): string {
  return 'relative min-h-0 flex-1 overflow-hidden';
}

/** Курсор колодца фото/схемы: drag/resize важнее zoom-in. */
export function resolveAnnotationWellCursorClass(input: {
  isDragging: boolean;
  isResizing?: boolean;
  showZoomCursor: boolean;
}): string {
  if (input.isDragging) {
    return ' cursor-grabbing';
  }
  if (input.isResizing) {
    return ' cursor-ew-resize';
  }
  if (input.showZoomCursor) {
    return ' cursor-zoom-in';
  }
  return '';
}

export function getDiagramCardEmptySlotClass(): string {
  return 'flex h-full w-full items-center justify-center text-[#6965DB]/45 dark:text-[#c5c1ff]/45';
}
