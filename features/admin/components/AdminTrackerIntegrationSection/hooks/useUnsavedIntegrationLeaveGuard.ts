'use client';

import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';

import { useConfirmDialog } from '@/components/ConfirmDialog';

export function linkLeavesCurrentPath(
  link: { download: boolean; href: string; rawHref: string | null; target: string },
  currentHref: string,
): boolean {
  if (link.target === '_blank' || link.download) {
    return false;
  }
  const raw = link.rawHref;
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('javascript:')) {
    return false;
  }
  try {
    const current = new URL(currentHref);
    const next = new URL(link.href, currentHref);
    return current.origin === next.origin && current.pathname !== next.pathname;
  } catch {
    return false;
  }
}

/** Ссылка, по которой клик уводит со страницы; `null` — клик не уводит. */
function leavingLinkHref(event: MouseEvent, currentHref: string): string | null {
  if (event.defaultPrevented || event.button !== 0) {
    return null;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  if (!(event.target instanceof Element)) {
    return null;
  }
  const anchor = event.target.closest('a');
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }
  const leaves = linkLeavesCurrentPath(
    {
      download: anchor.hasAttribute('download'),
      href: anchor.href,
      rawHref: anchor.getAttribute('href'),
      target: anchor.target,
    },
    currentHref,
  );
  return leaves ? anchor.href : null;
}

/**
 * Не дать уйти со страницы с несохранёнными правками: закрытие вкладки — системный вопрос браузера,
 * ссылка внутри приложения — диалог подтверждения приложения (`DialogComponent` рендерит вызывающий).
 */
export function useUnsavedIntegrationLeaveGuard(
  enabled: boolean,
  texts: { confirmText: string; message: string }
): ReactNode {
  const router = useRouter();
  const { confirm, DialogComponent } = useConfirmDialog();

  const askAndLeave = useEffectEvent(async (href: string) => {
    const leave = await confirm(texts.message, { confirmText: texts.confirmText, variant: 'destructive' });
    if (!leave) return;
    const target = new URL(href);
    router.push(`${target.pathname}${target.search}${target.hash}`);
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      const href = leavingLinkHref(event, window.location.href);
      if (!href) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void askAndLeave(href);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled]);

  return DialogComponent;
}
