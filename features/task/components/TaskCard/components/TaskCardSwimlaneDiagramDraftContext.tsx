'use client';

import { createContext, useContext } from 'react';

export interface TaskCardSwimlaneDiagramDraft {
  caption: string;
  isSubmitting: boolean;
  taskId: string;
  onCancel: () => void;
  onCaptionChange: (value: string) => void;
  onSubmit: () => void;
}

export const TaskCardSwimlaneDiagramDraftContext = createContext<TaskCardSwimlaneDiagramDraft | null>(
  null
);

export function useTaskCardSwimlaneDiagramDraft(): TaskCardSwimlaneDiagramDraft | null {
  return useContext(TaskCardSwimlaneDiagramDraftContext);
}
