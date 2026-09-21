import type { Comment, Task } from '@/types';

import {
  commentToSwimlaneTask,
  parseSwimlaneCommentTaskId,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';

export function resolveSwimlanePhotoLightboxTask(
  taskId: string,
  input: {
    comments: Comment[];
    sprintTasks: Task[];
    tasksMap?: Map<string, Task>;
  }
): Task | null {
  const fromMap = input.tasksMap?.get(taskId);
  if (fromMap && isSwimlaneImageTask(fromMap) && fromMap.imageUrl) {
    return fromMap;
  }

  const commentId = parseSwimlaneCommentTaskId(taskId);
  if (commentId) {
    const comment = input.comments.find((item) => item.id === commentId);
    if (comment?.kind === 'image' && comment.imageUrl) {
      return commentToSwimlaneTask(comment);
    }
    return null;
  }

  const fromList = input.sprintTasks.find((item) => item.id === taskId);
  if (fromList && isSwimlaneImageTask(fromList) && fromList.imageUrl) {
    return fromList;
  }

  return null;
}
