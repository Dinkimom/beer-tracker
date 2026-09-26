'use client';

import { useEffect } from 'react';

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

function shouldBlockLeaveClick(event: MouseEvent, currentHref: string): boolean {
  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (!(event.target instanceof Element)) {
    return false;
  }
  const anchor = event.target.closest('a');
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }
  return linkLeavesCurrentPath(
    {
      download: anchor.hasAttribute('download'),
      href: anchor.href,
      rawHref: anchor.getAttribute('href'),
      target: anchor.target,
    },
    currentHref,
  );
}

export function useUnsavedIntegrationLeaveGuard(enabled: boolean, message: string): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (!shouldBlockLeaveClick(event, window.location.href)) {
        return;
      }
      // eslint-disable-next-line no-alert -- same leave prompt as beforeunload, for in-app links
      if (window.confirm(message)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled, message]);
}
