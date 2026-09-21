'use client';

import type { CSSProperties, TransitionEvent } from 'react';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ZIndex } from '@/constants';
import { useResize } from '@/features/sidebar/hooks/useResize';

import {
  isResizableSidebarWidthTransitionFinished,
  nextResizableSidebarPhase,
  prefersResizableSidebarReducedMotion,
  RESIZABLE_SIDEBAR_ANIMATION_MS,
  resizableSidebarShellWidthPx,
  type ResizableSidebarPhase,
} from './resizableSidebarPresence';
import { applySidebarResizeEnd } from './resizableSidebarResizeEnd';
import { SidebarResizeHandle } from './SidebarResizeHandle';

interface ResizableSidebarProps {
  /**
   * Содержимое сайдбара
   */
  children: React.ReactNode;
  /**
   * Дополнительные классы для контейнера сайдбара
   */
  className?: string;
  /**
   * Дополнительные классы для контента сайдбара
   */
  contentClassName?: string;
  /**
   * Дополнительные элементы в заголовке (например, кнопки)
   */
  headerActions?: React.ReactNode;
  /**
   * Открыт ли сайдбар (для управления видимостью)
   */
  isOpen?: boolean;
  /**
   * Максимальная ширина
   * @default 800
   */
  maxWidth?: number;
  /**
   * Минимальная ширина
   * @default 250
   */
  minWidth?: number;
  /**
   * С какой стороны находится resize handle
   * @default 'left'
   */
  resizeHandleSide?: 'left' | 'right';
  /**
   * Дополнительные стили для контейнера сайдбара
   */
  style?: CSSProperties;
  /**
   * Заголовок сайдбара (отображается в верхней части)
   */
  title?: string;
  /**
   * Текущая ширина сайдбара
   */
  width: number;
  /**
   * Функция для вычисления ширины на основе позиции мыши
   * Если не указана, используется стандартная логика для правого сайдбара
   */
  calculateWidth?: (event: MouseEvent) => number;
  /**
   * Ref для контейнера сайдбара (например, для droppable)
   */
  containerRef?: (el: HTMLDivElement | null) => void;
  /**
   * Callback для переключения состояния открыт/закрыт
   */
  onToggle?: () => void;
  /**
   * Callback при изменении ширины
   */
  onWidthChange?: (width: number) => void;
}

/**
 * Переиспользуемая компонента сайдбара с поддержкой resize
 */
export function ResizableSidebar({
  children,
  width,
  onWidthChange,
  minWidth = 250,
  maxWidth = 800,
  resizeHandleSide = 'left',
  calculateWidth,
  isOpen = true,
  onToggle,
  className = '',
  style,
  containerRef,
  contentClassName = '',
  title,
  headerActions,
}: ResizableSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const wasOpenOnResizeStart = useRef<boolean>(isOpen);
  const [phase, setPhase] = useState<ResizableSidebarPhase>(isOpen ? 'open' : 'closed');

  const { isResizing, setIsResizing } = useResize({
    calculateValue: calculateWidth || defaultCalculateWidth(resizeHandleSide),
    onValueChange: (newWidth) => {
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
      if (!isOpen && newWidth > 0 && onToggle) {
        onToggle();
      }
    },
    onResizeEnd: (finalWidth) => {
      applySidebarResizeEnd({
        closeThreshold: Math.min(minWidth / 2, 50),
        finalWidth,
        minWidth,
        onToggle,
        onWidthChange,
        wasOpenOnResizeStart: wasOpenOnResizeStart.current,
      });
    },
    min: 0, // Разрешаем перетаскивание до нуля
    max: maxWidth,
    clamp: true,
  });

  const nextPhase = nextResizableSidebarPhase(
    isOpen,
    phase,
    prefersResizableSidebarReducedMotion(),
    isResizing
  );
  if (nextPhase !== phase) {
    setPhase(nextPhase);
  }

  useEffect(() => {
    if (phase !== 'entering') {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      setPhase((current) => (current === 'entering' ? 'open' : current));
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'exiting') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setPhase((current) => (current === 'exiting' ? 'closed' : current));
    }, RESIZABLE_SIDEBAR_ANIMATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  const handleRef = (el: HTMLDivElement | null) => {
    sidebarRef.current = el;
    if (containerRef) {
      containerRef(el);
    }
  };

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (
        !isResizableSidebarWidthTransitionFinished(
          event.propertyName,
          event.target,
          event.currentTarget,
          phase
        )
      ) {
        return;
      }
      setPhase('closed');
    },
    [phase]
  );

  const mounted = phase !== 'closed';
  const shellWidth = resizableSidebarShellWidthPx(phase, width);
  const animateWidth = !isResizing && !prefersResizableSidebarReducedMotion();
  const baseClasses =
    'relative h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col self-stretch overflow-hidden';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    wasOpenOnResizeStart.current = isOpen;
    setIsResizing(true);
  };

  return (
    <>
      {/* Resize handle (всегда видимый, даже когда сайдбар закрыт) */}
      {!mounted && (
        <div
          className={`absolute top-0 bottom-0 ${resizeHandleSide === 'left' ? 'right-0' : 'left-0'} w-1.5`}
          style={{
            [resizeHandleSide === 'left' ? 'right' : 'left']: '0px',
            zIndex: ZIndex.sidebarResize,
          }}
        >
          <SidebarResizeHandle
            isResizing={isResizing}
            linesCount={3}
            side={resizeHandleSide}
            onMouseDown={onResizeMouseDown}
          />
        </div>
      )}

      {/* Сайдбар */}
      {mounted && (
        <div
          ref={handleRef}
          className={`${combinedClassName} resizable-sidebar-shell`}
          style={{
            width: `${shellWidth}px`,
            minWidth: 0,
            pointerEvents: phase === 'exiting' ? 'none' : undefined,
            transition: animateWidth
              ? `width ${RESIZABLE_SIDEBAR_ANIMATION_MS}ms ease-in-out`
              : 'none',
            ...style,
            // После ...style: выше sticky-шапки дней в соседней колонке планера
            zIndex: style?.zIndex ?? ZIndex.sidebarResize,
          }}
          onTransitionEnd={onTransitionEnd}
        >
          <div
            className="flex h-full min-h-0 flex-col"
            style={{
              width: `${width}px`,
              minWidth: `${width}px`,
            }}
          >
            {/* Заголовок сайдбара */}
            {(title || headerActions) && (
              <div
                className={`relative flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${title ? 'px-5 py-2.5' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  {title && (
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {title}
                    </h3>
                  )}
                  {!title && headerActions && <div className="w-full flex-1">{headerActions}</div>}
                  {title && <div className="flex items-center gap-2">{headerActions}</div>}
                </div>
              </div>
            )}

            {/* Контент сайдбара */}
            <div className={`min-h-0 flex-1 ${contentClassName}`.trim()}>{children}</div>
          </div>

          {/* После контента — иначе relative-шапка табов перекрывает хендл */}
          <SidebarResizeHandle
            isResizing={isResizing}
            linesCount={3}
            side={resizeHandleSide}
            onMouseDown={onResizeMouseDown}
          />
        </div>
      )}
    </>
  );
}

function defaultCalculateWidth(resizeHandleSide: 'left' | 'right') {
  return (e: MouseEvent) => {
    if (resizeHandleSide === 'left') {
      // Для сайдбара справа с handle слева
      return window.innerWidth - e.clientX;
    }
    // Для сайдбара слева с handle справа
    return e.clientX;
  };
}
