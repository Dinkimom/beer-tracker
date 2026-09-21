'use client';

import { createContext, useContext } from 'react';

export interface TaskCardSwimlaneImageDraft {
  caption: string;
  imageUrl?: string;
  isSubmitting: boolean;
  taskId: string;
  onCancel: () => void;
  onCaptionChange: (value: string) => void;
  onImageUrlChange: (url: string | undefined) => void;
  onSubmit: () => void;
}

export const TaskCardSwimlaneImageDraftContext = createContext<TaskCardSwimlaneImageDraft | null>(
  null
);

export function useTaskCardSwimlaneImageDraft(): TaskCardSwimlaneImageDraft | null {
  return useContext(TaskCardSwimlaneImageDraftContext);
}
