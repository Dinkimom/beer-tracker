import type { ReactNode } from 'react';

export const iconGlyphs: Record<string, ReactNode> = {
  // Chevron иконки
  'chevron-down': (
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'chevron-down-bold': (
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
  ),
  'chevron-up': (
    <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'chevron-right': (
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'chevron-left': (
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),

  'arrow-left': (
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'undo': (
    <>
      <path d="M9 14 4 9l5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M4 9h10.5a5.5 5.5 0 1 1 0 11H11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'redo': (
    <>
      <path d="m15 14 5-5-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M20 9H9.5a5.5 5.5 0 1 0 0 11H13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),

  // Действия
  'plus': (
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'plus-bold': (
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
  ),
  'minus-bold': (
    <path d="M5 12h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
  ),
  'check': (
    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'check-bold': (
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
  ),
  'x': (
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  /** Алиас к `x` — в UI часто семантически «закрыть» */
  close: (
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'grip-vertical': (
    <>
      <circle cx="9" cy="5" fill="currentColor" r="1" />
      <circle cx="9" cy="12" fill="currentColor" r="1" />
      <circle cx="9" cy="19" fill="currentColor" r="1" />
      <circle cx="15" cy="5" fill="currentColor" r="1" />
      <circle cx="15" cy="12" fill="currentColor" r="1" />
      <circle cx="15" cy="19" fill="currentColor" r="1" />
    </>
  ),
  'x-bold': (
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
  ),
  'circle-x': (
    <>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M16 8l-8 8M8 8l8 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'circle-help': (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 17h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'circle-info': (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 16v-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 8h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'edit': (
    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'users': (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  /** Фаза на таймлайне, разбитая на отрезки (занятость) */
  'phase-segments': (
    <>
      <rect
        fill="none"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
        width="16"
        x="4"
        y="7"
      />
      <path d="M9.5 7v10M14.5 7v10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </>
  ),
  'trash': (
    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'drag-handle': (
    <>
      <circle cx="9" cy="5" fill="currentColor" r="1"/>
      <circle cx="9" cy="12" fill="currentColor" r="1"/>
      <circle cx="9" cy="19" fill="currentColor" r="1"/>
      <circle cx="15" cy="5" fill="currentColor" r="1"/>
      <circle cx="15" cy="12" fill="currentColor" r="1"/>
      <circle cx="15" cy="19" fill="currentColor" r="1"/>
    </>
  ),
  'dots-horizontal': (
    <>
      <circle cx="6" cy="12" fill="currentColor" r="1.5" />
      <circle cx="12" cy="12" fill="currentColor" r="1.5" />
      <circle cx="18" cy="12" fill="currentColor" r="1.5" />
    </>
  ),
  'sparkles': (
    <>
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
      <path d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z" fill="currentColor" />
      <path d="M5 19L5.5 20.5L7 21L5.5 21.5L5 23L4.5 21.5L3 21L4.5 20.5L5 19Z" fill="currentColor" />
    </>
  ),
  'play': (
    <>
      <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'pause': (
    <>
      <path d="M10 9v6M14 9v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'stop': (
    <>
      <rect height="6" rx="1" stroke="currentColor" strokeWidth="2" width="6" x="9" y="9" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'clock': (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'stopwatch': (
    <>
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 9v4l2.5 1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M10 2h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 2v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'play-fill': (
    <path
      d="M7 6.05a1.15 1.15 0 0 1 1.76-.7l8.35 5.2a1.15 1.15 0 0 1 0 1.9l-8.35 5.2a1.15 1.15 0 0 1-1.76-.7V6.05z"
      fill="currentColor"
    />
  ),
  'pause-fill': (
    <>
      <rect fill="currentColor" height="12" rx="1.5" width="3.75" x="6.25" y="6" />
      <rect fill="currentColor" height="12" rx="1.5" width="3.75" x="14" y="6" />
    </>
  ),

  // UI элементы
  'calendar': (
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'user': (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'spinner': (
    <>
      <circle cx="12" cy="12" opacity="0.25" r="10" stroke="currentColor" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
    </>
  ),
  'search': (
    <>
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'menu': (
    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'refresh': (
    <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'home': (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'mail': (
    <>
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m22 6-10 7L2 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </>
  ),
  'minimize': (
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'maximize': (
    <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  ),
  'sun': (
    <>
      <circle cx="12" cy="12" fill="currentColor" r="5" />
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="12" x2="12" y1="1" y2="3"/>
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="12" x2="12" y1="21" y2="23"/>
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="4.22" x2="5.64" y1="4.22" y2="5.64"/>
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="18.36" x2="19.78" y1="18.36" y2="19.78"/>
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="1" x2="3" y1="12" y2="12"/>
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="21" x2="23" y1="12" y2="12"/>
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="4.22" x2="5.64" y1="19.78" y2="18.36"/>
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="18.36" x2="19.78" y1="5.64" y2="4.22"/>
    </>
  ),
  'moon': (
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
  ),
  'snowflake': (
    <>
      <path d="M12 2v20M2 12h20M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66M19.07 4.93L4.93 19.07M4.93 4.93L19.07 19.07" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="12" cy="2" fill="currentColor" r="1.5" />
      <circle cx="12" cy="22" fill="currentColor" r="1.5" />
      <circle cx="2" cy="12" fill="currentColor" r="1.5" />
      <circle cx="22" cy="12" fill="currentColor" r="1.5" />
      <circle cx="6.34" cy="6.34" fill="currentColor" r="1" />
      <circle cx="17.66" cy="17.66" fill="currentColor" r="1" />
      <circle cx="17.66" cy="6.34" fill="currentColor" r="1" />
      <circle cx="6.34" cy="17.66" fill="currentColor" r="1" />
    </>
  ),
};
