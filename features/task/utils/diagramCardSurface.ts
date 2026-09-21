import type { CSSProperties } from 'react';

interface DiagramCardPaint {
  background: string;
  border: string;
  caption: string;
  shadow: string;
}

const DIAGRAM_PAINT_LIGHT: DiagramCardPaint = {
  background: '#f3f0ff',
  border: '#c5bff5',
  caption: '#5b57c4',
  shadow: '3px 10px 22px rgba(105, 101, 219, 0.2), 0 1px 2px rgba(105, 101, 219, 0.12)',
};

const DIAGRAM_PAINT_DARK: DiagramCardPaint = {
  background: '#1c1b2e',
  border: '#4c4890',
  caption: '#c5c1ff',
  shadow: '3px 12px 26px rgba(0, 0, 0, 0.52), 0 1px 2px rgba(105, 101, 219, 0.28)',
};

function getDiagramCardPaint(isDark = false): DiagramCardPaint {
  return isDark ? DIAGRAM_PAINT_DARK : DIAGRAM_PAINT_LIGHT;
}

export function getDiagramCardStyle(isDark = false): CSSProperties {
  const paint = getDiagramCardPaint(isDark);
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

export function getDiagramCardDashedGhostStyle(isDark = false): CSSProperties {
  const paint = getDiagramCardPaint(isDark);
  return {
    backgroundColor: paint.background,
    borderColor: paint.border,
    borderRadius: 0,
    borderStyle: 'dashed',
    borderWidth: 2,
    boxShadow: 'none',
    color: paint.caption,
  };
}

export function getDiagramCardDeleteButtonStyle(isDark = false): CSSProperties {
  const paint = getDiagramCardPaint(isDark);
  return {
    backgroundColor: paint.background,
    borderColor: paint.border,
    color: paint.caption,
  };
}
