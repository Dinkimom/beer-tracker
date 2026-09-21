import type { CSSProperties } from 'react';

/** Общая оболочка слоя стрелок под карточками (z-index задаётся отдельно). */
export const TASK_ARROW_LAYER_SHELL_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  height: 0,
  minHeight: 0,
  maxHeight: 0,
  overflow: 'visible',
  pointerEvents: 'none',
  contain: 'layout size style',
};
