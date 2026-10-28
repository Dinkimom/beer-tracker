import type { RefObject } from 'react';

import { useEffect, useEffectEvent } from 'react';

import { useEscapeKey } from '@/hooks/useEscapeKey';

type EscapeKeyOptions = NonNullable<Parameters<typeof useEscapeKey>[1]>;

interface UsePopoverDismissOptions {
  capture?: boolean;
  enabled: boolean;
  /** Escape закрывает тем же колбэком; опции — как у `useEscapeKey`. По умолчанию не слушаем. */
  escape?: Omit<EscapeKeyOptions, 'enabled'> | false;
  /** `mousedown` не срабатывает от касания без мыши; у каждого окна своё, не менять без проверки. */
  event?: 'mousedown' | 'pointerdown';
  /** ...и внутри элементов по селектору: подменю и диалоги в портале. */
  ignoreSelector?: string;
  /** Правая/средняя кнопка не закрывает. */
  primaryButtonOnly?: boolean;
  /** Нажатие внутри этих узлов не закрывает. */
  refs: ReadonlyArray<RefObject<Element | null>>;
}

/**
 * Закрытие всплывающего окна: нажатие мимо `refs` на `document` и, по опции, Escape.
 * Колбэк и проверка «внутри» берутся свежие — подписка меняется только вместе с опциями.
 */
export function usePopoverDismiss(
  onDismiss: () => void,
  {
    capture = false,
    enabled,
    escape = false,
    event = 'pointerdown',
    ignoreSelector,
    primaryButtonOnly = false,
    refs,
  }: UsePopoverDismissOptions
): void {
  const dismissIfOutside = useEffectEvent((pointerEvent: MouseEvent) => {
    if (primaryButtonOnly && pointerEvent.button !== 0) return;
    const target = pointerEvent.target;
    if (!(target instanceof Node)) return;
    if (refs.some((ref) => ref.current?.contains(target))) return;
    if (ignoreSelector && target instanceof Element && target.closest(ignoreSelector)) return;
    onDismiss();
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: Event) => dismissIfOutside(e as MouseEvent);
    document.addEventListener(event, listener, capture);
    return () => document.removeEventListener(event, listener, capture);
  }, [capture, enabled, event]);

  useEscapeKey(onDismiss, { ...(escape || {}), enabled: enabled && escape !== false });
}
