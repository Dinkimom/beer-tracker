'use client';

import type { Anchor } from '@/types';

import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useState } from 'react';

import { useSingleTooltipGroup } from './SingleTooltipGroupContext';
import { applyTextTooltipOpenChange } from './textTooltipOpenChange';
import { TextTooltipPortalContent } from './TextTooltipPortalContent';
import { buildTextTooltipTrigger, resolveTextTooltipEffectiveOpen } from './textTooltipTriggerHelpers';

type TextTooltipAlign = 'center' | 'end' | 'start';
type TextTooltipSide = Anchor;

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

  if (disabled || content == null || content === '') {
    return children;
  }

  const trigger = buildTextTooltipTrigger(children, followCursor, setCursorPos);
  const effectiveOpen = resolveTextTooltipEffectiveOpen(open, singleInGroupId, group);

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
      skipDelayDuration={100}
    >
      <Tooltip.Root open={effectiveOpen} onOpenChange={handleOpenChange}>
        <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
        <Tooltip.Portal>
          <TextTooltipPortalContent
            align={align}
            content={content}
            contentClassName={contentClassName}
            cursorPos={cursorPos}
            followCursor={followCursor}
            interactive={interactive}
            open={effectiveOpen}
            side={side}
            sideOffset={sideOffset}
          />
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
