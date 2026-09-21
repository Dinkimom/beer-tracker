export interface ParticipantsColumnResizeGeometry {
  height: number;
  left: number;
  top: number;
}

/**
 * Visible strip of the participants column: intersection of scrollport
 * with the header+lanes content box (excludes empty flex filler below rows).
 */
export function intersectParticipantsColumnResizeGeometry(
  scrollRect: Pick<DOMRectReadOnly, 'bottom' | 'left' | 'top'>,
  contentTop: number,
  contentBottom: number
): ParticipantsColumnResizeGeometry {
  const top = Math.max(scrollRect.top, contentTop);
  const bottom = Math.min(scrollRect.bottom, contentBottom);
  return {
    left: scrollRect.left,
    top,
    height: Math.max(0, bottom - top),
  };
}
