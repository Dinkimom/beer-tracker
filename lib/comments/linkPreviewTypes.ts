import { resolveStickyNoteLinkFallbackLabel } from '@/lib/comments/stickyNoteLinkLabel';
import { resolveStickyNoteLinkHostname } from '@/lib/comments/stickyNoteLinks';

export interface LinkPreview {
  faviconUrl: string | null;
  hostname: string;
  title: string;
  url: string;
}

export function createFallbackLinkPreview(href: string): LinkPreview {
  return {
    faviconUrl: null,
    hostname: resolveStickyNoteLinkHostname(href),
    title: resolveStickyNoteLinkFallbackLabel(href),
    url: href,
  };
}
