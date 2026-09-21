'use client';

import type { Comment, Task } from '@/types';

import { observer } from 'mobx-react-lite';

import { SwimlaneImageLightbox } from '@/features/task/components/TaskCard/components/SwimlaneImageLightbox';
import { useRootStore } from '@/lib/layers';

import { resolveSwimlanePhotoLightboxTask } from './resolveSwimlanePhotoLightboxTask';

interface SwimlanePhotoLightboxHostProps {
  comments: Comment[];
  sprintTasks: Task[];
  tasksMap?: Map<string, Task>;
}

export const SwimlanePhotoLightboxHost = observer(function SwimlanePhotoLightboxHost({
  comments,
  sprintTasks,
  tasksMap,
}: SwimlanePhotoLightboxHostProps) {
  const { sprintPlannerUi } = useRootStore();
  const taskId = sprintPlannerUi.photoLightboxTaskId;
  if (!taskId) {
    return null;
  }

  const task = resolveSwimlanePhotoLightboxTask(taskId, { comments, sprintTasks, tasksMap });
  if (!task?.imageUrl) {
    return null;
  }

  return (
    <SwimlaneImageLightbox
      authorName={task.stickyNoteAuthorName}
      caption={task.name}
      src={task.imageUrl}
      onClose={sprintPlannerUi.closePhotoLightbox}
    />
  );
});
