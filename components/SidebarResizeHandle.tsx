'use client';

import type { CSSProperties } from 'react';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import {
  sidebarResizeHandleShellClass,
  sidebarResizeSidePositionClass,
} from './sidebarResizeHandleShellClass';
import { SidebarResizeInlineIndicator } from './SidebarResizeInlineIndicator';
import { useSidebarResizeHandleLayout } from './useSidebarResizeHandleLayout';

interface SidebarResizeHandleProps {
  columnHeight?: number;
  columnLeft?: number;
  columnTop?: number;
  columnWidth?: number;
  fixedIconInViewport?: boolean;
  isResizing?: boolean;
  linesCount?: 2 | 3;
  /** Переопределение left-0 / right-0 */
  positionClassName?: string;
  /** Рукоятка и подсветка только на hover / во время drag */
  revealOnHover?: boolean;
  side?: 'left' | 'right';
  title?: string;
  /** Переопределение w-1.5 */
  widthClassName?: string;
  /**
   * Числовой z-index (inline), чтобы хендл был выше relative-шапки табов.
   * Default: sidebarResize; для fixedIconInViewport — floatingControls.
   */
  zIndex?: number;
  /** Переопределение z-index shell (Tailwind-класс; дополняет inline zIndex) */
  zIndexClassName?: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Переиспользуемый компонент для resize handle сайдбара
 */
export function SidebarResizeHandle({
  side = 'left',
  isResizing = false,
  onMouseDown,
  title: titleProp,
  linesCount = 3,
  fixedIconInViewport = false,
  revealOnHover = false,
  columnHeight,
  columnLeft,
  columnTop,
  columnWidth,
  positionClassName,
  widthClassName,
  zIndex: zIndexProp,
  zIndexClassName,
}: SidebarResizeHandleProps) {
  const { t } = useI18n();
  const title = titleProp ?? t('common.resizePanelWidth');
  const layout = useSidebarResizeHandleLayout({
    columnHeight,
    columnLeft,
    columnTop,
    columnWidth,
    fixedIconInViewport,
    side,
  });
  const zIndex =
    zIndexProp ??
    (fixedIconInViewport ? ZIndex.floatingControls : ZIndex.sidebarResize);

  const shellClass = sidebarResizeHandleShellClass({
    fixedIconInViewport,
    isResizing,
    positionClass: positionClassName ?? sidebarResizeSidePositionClass(side),
    widthClass: widthClassName,
    zIndexClass: zIndexClassName,
  });

  const handleStyle: CSSProperties = {
    ...layout.handlePositionStyle,
    zIndex: layout.handlePositionStyle?.zIndex ?? zIndex,
  };

  return (
    <div
      className={shellClass}
      style={handleStyle}
      title={title}
      onMouseDown={onMouseDown}
    >
      <div className="absolute inset-0 bg-transparent group-hover:bg-blue-100/60 dark:group-hover:bg-blue-900/40 transition-colors duration-200 cursor-col-resize" />
      {layout.showInlineIndicator ? (
        <SidebarResizeInlineIndicator
          isActive={isResizing}
          linesCount={linesCount}
          revealOnHover={revealOnHover}
          side={side}
          translateClass={layout.translateClass}
        />
      ) : null}
    </div>
  );
}
