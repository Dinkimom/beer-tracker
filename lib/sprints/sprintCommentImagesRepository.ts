import { insertPlannerFileComment, getPlannerCommentStoredBytes } from './sprintPlannerFilesRepository';

export function insertSprintImageComment(input: {
  assigneeId: string;
  caption: string;
  commentId: string | undefined;
  contentType: string;
  createdBy: string | null;
  data: Buffer;
  day: number;
  height: number;
  organizationId: string;
  part: number;
  sprintId: number;
  width: number;
}): Promise<unknown> {
  return insertPlannerFileComment({
    ...input,
    kind: 'image',
    text: input.caption,
  });
}

export function getSprintCommentImage(input: {
  commentId: string;
  organizationId: string;
  sprintId: number;
}): Promise<{ contentType: string; data: Buffer } | null> {
  return getPlannerCommentStoredBytes({ ...input, kind: 'image' });
}
