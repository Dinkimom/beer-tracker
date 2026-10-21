import type { DemoFixtureResult } from './demoFixtureRouterTypes';
import type { DemoFixtureState } from './demoFixtureSeed';

import { getDemoFixtureStore, removeDemoComment, upsertDemoComment } from './demoFixtureStore';

type DemoCommentRow = DemoFixtureState['comments'][number];

const COMMENTS_PATH = /^\/sprints\/\d+\/comments$/;

let demoCommentSeq = 0;

function ok(data: unknown, status = 200): DemoFixtureResult {
  return { data, status };
}

function optionalNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function newDemoCommentId(): string {
  demoCommentSeq += 1;
  return `demo-comment-${Date.now()}-${demoCommentSeq}`;
}

/** Тело POST/PUT приходит в camelCase; в хранилище — строки как из БД. */
function commentRowFromBody(body: Record<string, unknown>, previous?: DemoCommentRow): DemoCommentRow {
  const id = typeof body.id === 'string' && body.id ? body.id : (previous?.id ?? newDemoCommentId());
  return {
    ...previous,
    id,
    assignee_id: String(body.assigneeId ?? previous?.assignee_id ?? ''),
    author_name: previous?.author_name ?? 'Demo User',
    color: typeof body.color === 'string' ? body.color : (previous?.color ?? 'yellow'),
    created_at: previous?.created_at ?? new Date().toISOString(),
    day: optionalNumber(body.day ?? previous?.day),
    height: Number(body.height ?? previous?.height ?? 1),
    kind: (body.kind as DemoCommentRow['kind']) ?? previous?.kind ?? 'text',
    parent: (body.parent as DemoCommentRow['parent']) ?? previous?.parent ?? null,
    part: optionalNumber(body.part ?? previous?.part),
    text: String(body.text ?? previous?.text ?? ''),
    width: Number(body.width ?? previous?.width ?? 1),
    x: optionalNumber(body.x ?? previous?.x),
    y: optionalNumber(body.y ?? previous?.y),
  };
}

function updateComment(commentId: string | null, body: Record<string, unknown>): DemoFixtureResult {
  const previous = getDemoFixtureStore().comments.find((c) => c.id === commentId);
  if (!previous) {
    return ok({ error: 'Comment not found' }, 404);
  }
  const row = commentRowFromBody({ ...body, id: previous.id }, previous);
  upsertDemoComment(row);
  return ok({ success: true, comment: row });
}

/** Заметки и виджеты демо живут в памяти вкладки: ставятся, правятся и удаляются до перезагрузки. */
export function handleDemoComments(
  path: string,
  method: string,
  params: URLSearchParams,
  body: unknown
): DemoFixtureResult | null {
  if (!path.includes('/comments')) {
    return null;
  }
  if (!COMMENTS_PATH.test(path)) {
    return ok({ success: true, comment: { id: newDemoCommentId() } });
  }
  const payload = (body ?? {}) as Record<string, unknown>;
  if (method === 'get') {
    return ok({ comments: getDemoFixtureStore().comments });
  }
  if (method === 'post') {
    const row = commentRowFromBody(payload);
    upsertDemoComment(row);
    return ok({ success: true, comment: row });
  }
  if (method === 'put') {
    return updateComment(params.get('commentId'), payload);
  }
  if (method === 'delete') {
    removeDemoComment(params.get('commentId') ?? '');
    return ok({ success: true });
  }
  return null;
}
