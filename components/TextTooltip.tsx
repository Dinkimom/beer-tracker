'use client';

import type { Anchor } from '@/types';
import type { ReactElement } from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useState } from 'react';

import { useOverlayPresence } from '@/hooks/useOverlayPresence';

import { useSingleTooltipGroup } from './SingleTooltipGroupContext';
import { applyTextTooltipOpenChange } from './textTooltipOpenChange';
import { TextTooltipPortalContent } from './TextTooltipPortalContent';
import { buildTextTooltipTrigger, resolveTextTooltipEffectiveOpen } from './textTooltipTriggerHelpers';

type TextTooltipAlign = 'center' | 'end' | 'start';
type TextTooltipSide = Anchor;

/** Рукоятки ресайза: не мигать подсказкой, пока целишься в жест. */
export const RESIZE_HANDLE_TOOLTIP_DELAY_MS = 700;

interface TextTooltipProps {
  /** Выравнивание по стороне */
  align?: TextTooltipAlign;
  /** Элемент-триггер (при наведении показывается тултип) */
  children: React.ReactElement;
  /** Контент тултипа (строка или React-элемент) */
  content: React.ReactNode;
  /** Дополнительные классы для контента */
  contentClassName?: string;
  /** Задержка перед показом (мс) */
  delayDuration?: number;
  /** Отключить тултип (например, когда content пустой) */
  disabled?: boolean;
  /**
   * Окно после закрытия, в котором следующий показ без delay (Radix skipDelayDuration).
   * Для рукояток ресайза лучше 0 — иначе подсказка мигает при прицеливании.
   */
  skipDelayDuration?: number;
  /** Показывать тултип в точке наведения курсора (вместо сверху по центру триггера) */
  followCursor?: boolean;
  /** Интерактивный режим (позволяет скролл и клики внутри тултипа) */
  interactive?: boolean;
  /** Сторона позиционирования относительно триггера */
  side?: TextTooltipSide;
  /** Отступ от триггера (px) */
  sideOffset?: number;
  /**
   * Уникальный id в рамках группы (SingleTooltipGroupProvider).
   * В группе одновременно виден только один тултип.
   */
  singleInGroupId?: string;
  /** Колбэк при открытии/закрытии (для ленивой подгрузки контента). */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Текстовый тултип на Radix UI.
 * Рендерится в body через Portal, позиционируется рядом с триггером.
 * С опцией followCursor — в месте наведения курсора.
 */
export function TextTooltip({
  children,
  content,
  delayDuration = 300,
  skipDelayDuration = 100,
  side = 'bottom',
  align = 'center',
  sideOffset = 6,
  contentClassName = '',
  disabled = false,
  followCursor = false,
  interactive = false,
  singleInGroupId,
  onOpenChange,
}: TextTooltipProps) {
  const [open, setOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const group = useSingleTooltipGroup();

  useEffect(() => {
    if (singleInGroupId && group?.openId != null && group.openId !== singleInGroupId) {
      queueMicrotask(() => setOpen(false));
    }
  }, [singleInGroupId, group?.openId]);

  const contentVisible = !disabled && content != null && content !== '';
  const effectiveOpen = contentVisible
    ? resolveTextTooltipEffectiveOpen(open, singleInGroupId, group)
    : false;
  const presence = useOverlayPresence(effectiveOpen);

  if (!contentVisible) {
    return children;
  }

  const trigger = buildTextTooltipTrigger(children, followCursor, setCursorPos);

  const handleOpenChange = (next: boolean) => {
    applyTextTooltipOpenChange({
      group,
      next,
      onOpenChange,
      setOpen,
      singleInGroupId,
    });
  };

  return (
    <Tooltip.Provider
      delayDuration={delayDuration}
      disableHoverableContent={!interactive}
      skipDelayDuration={skipDelayDuration}
    >
      <Tooltip.Root open={effectiveOpen} onOpenChange={handleOpenChange}>
        <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
        {presence.mounted ? (
          <Tooltip.Portal forceMount>
            <TextTooltipPortalContent
              align={align}
              content={content}
              contentClassName={contentClassName}
              cursorPos={cursorPos}
              followCursor={followCursor}
              interactive={interactive}
              overlayState={presence.state}
              side={side}
              sideOffset={sideOffset}
              onAnimationEnd={presence.onAnimationEnd}
            />
          </Tooltip.Portal>
        ) : null}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/** `title` с кнопки: стилизованный тултип. На disabled кнопка не ловит hover — оборачиваем span. */
export function wrapWithTextTooltip(
  node: ReactElement,
  content: string | undefined,
  options?: { disabled?: boolean; fullWidth?: boolean }
): ReactElement {
  if (!content) {
    return node;
  }
  if (options?.disabled) {
    const shellClass = options.fullWidth ? 'flex min-w-0 flex-1' : 'inline-flex max-w-full';
    return (
      <TextTooltip content={content}>
        <span className={shellClass}>{node}</span>
      </TextTooltip>
    );
  }
  return <TextTooltip content={content}>{node}</TextTooltip>;
}
