'use client';

import type { ReactNode } from 'react';

import { TASK_ARROW_LAYER_SHELL_STYLE } from '@/features/swimlane/utils/task-arrows/taskArrowsLayerStyle';

export function TaskArrowLayer({
  children,
  zIndex,
}: {
  children: ReactNode;
  zIndex: number;
}) {
  return <div style={{ ...TASK_ARROW_LAYER_SHELL_STYLE, zIndex }}>{children}</div>;
}
