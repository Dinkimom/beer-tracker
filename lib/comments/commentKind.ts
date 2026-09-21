type PlannerCommentKind = 'diagram' | 'image' | 'text';

export function parsePlannerCommentKind(value: unknown): PlannerCommentKind {
  if (value === 'image' || value === 'diagram') {
    return value;
  }
  return 'text';
}

export function plannerCommentImageUrl(sprintId: number, commentId: string): string {
  return `/api/sprints/${sprintId}/comments/${commentId}/image`;
}

export function plannerCommentDiagramUrl(sprintId: number, commentId: string): string {
  return `/api/sprints/${sprintId}/comments/${commentId}/diagram`;
}

export function parsePlannerCommentDiagramUrl(
  url: string | undefined
): { commentId: string; sprintId: number } | null {
  if (!url) {
    return null;
  }
  const match = /\/sprints\/(\d+)\/comments\/([^/?#]+)\/diagram/.exec(url);
  if (!match) {
    return null;
  }
  const sprintId = Number.parseInt(match[1] ?? '', 10);
  const commentId = match[2];
  if (!Number.isFinite(sprintId) || !commentId) {
    return null;
  }
  return { commentId, sprintId };
}
