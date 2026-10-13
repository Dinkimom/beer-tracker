import type { Comment, TaskParent } from '@/types';

import { resolveAnnotationPersistFromLaneDraft } from '@/features/swimlane/utils/featureSwimlaneRows';
import { createTicTacToeState, serializeTicTacToeWidget } from '@/lib/widgets/ticTacToe';
import { resolveTicTacToeCardSize } from '@/lib/widgets/ticTacToeCardSize';

export function buildTicTacToeComment(input: {
  assigneeId: string;
  day: number;
  parent?: TaskParent;
  part: number;
  timelineTotalParts: number;
}): Comment {
  const id = crypto.randomUUID();
  const persist = resolveAnnotationPersistFromLaneDraft(
    { assignee: input.assigneeId, parent: input.parent },
    input.assigneeId
  );
  const size = resolveTicTacToeCardSize(input.day, input.part, input.timelineTotalParts);
  return {
    id,
    clientInstanceId: id,
    assigneeId: persist.assigneeId,
    color: 'gray',
    day: input.day,
    height: size.height,
    kind: 'widget',
    part: input.part,
    skipMentionNotifications: true,
    text: serializeTicTacToeWidget(createTicTacToeState()),
    width: size.width,
    x: 0,
    y: 0,
    ...(persist.parent ? { parent: persist.parent } : {}),
  };
}
