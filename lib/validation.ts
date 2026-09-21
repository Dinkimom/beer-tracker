/**
 * Схемы валидации Zod для API endpoints
 */

import { z } from 'zod';

import { MAX_PLANNER_DAY_INDEX, MAX_PLANNER_DURATION_PARTS } from '@/constants';
import { PLANNER_COMMENT_TEXT_MAX_LENGTH } from '@/lib/comments/excalidrawCommentPayload';
import { STICKY_NOTE_COLORS } from '@/lib/comments/stickyNoteColor';
import { MAX_STICKY_NOTE_REACTION_EMOJI_LENGTH } from '@/lib/comments/stickyNoteReaction';
const PhaseSegmentSchema = z.object({
  startDay: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
  startPart: z.number().int().min(0).max(2),
  duration: z.number().int().positive().max(MAX_PLANNER_DURATION_PARTS),
});

export const TaskPositionSchema = z.object({
  taskId: z.string().min(1).max(255),
  assigneeId: z.string().min(1).max(255),
  startDay: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
  startPart: z.number().int().min(0).max(2),
  duration: z.number().int().positive().max(MAX_PLANNER_DURATION_PARTS),
  plannedStartDay: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX).optional().nullable(),
  plannedStartPart: z.number().int().min(0).max(2).optional().nullable(),
  plannedDuration: z.number().int().positive().max(MAX_PLANNER_DURATION_PARTS).optional().nullable(),
  isQa: z.boolean().optional(),
  /** Ключ задачи разработки (для QA: qaEngineer обновляется на dev-задаче) */
  devTaskKey: z.string().min(1).max(255).optional(),
  /**
   * Отрезки фазы (дробление).
   * Если поле отсутствует — сегменты не трогаем.
   * Если передан пустой массив — удаляем все сегменты для позиции.
   * Если массив непустой — перезаписываем сегменты.
   */
  segments: z.array(PhaseSegmentSchema).max(100).optional(),
  /**
   * Разрешить ли синхронизацию исполнителя с трекером для этой позиции.
   * Если false — сервер не будет вызывать updateIssue в трекере.
   * Если undefined/true — поведение по умолчанию (синхронизируем).
   */
  syncAssignee: z.boolean().optional(),
});

export const TaskLinkSchema = z.object({
  id: z.string().min(1).max(255),
  fromTaskId: z.string().min(1).max(255),
  toTaskId: z.string().min(1).max(255),
  fromAnchor: z.enum(['left', 'right', 'top', 'bottom']).optional().nullable(),
  toAnchor: z.enum(['left', 'right', 'top', 'bottom']).optional().nullable(),
});

const CommentKindSchema = z.enum(['diagram', 'image', 'text']);

const CommentParentSchema = z.object({
  display: z.string().trim().min(1).max(500),
  id: z.string().trim().min(1).max(255),
  key: z.string().trim().min(1).max(255),
  self: z.string().trim().max(2000).optional(),
});

export const CommentSchema = z
  .object({
    id: z.string().uuid().optional(),
    assigneeId: z.string().min(1).max(255),
    text: z.string().max(PLANNER_COMMENT_TEXT_MAX_LENGTH),
    x: z.number().optional().nullable(),
    y: z.number().int().min(0).max(9).optional().nullable(),
    day: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX).optional().nullable(),
    part: z.number().int().min(0).max(2).optional().nullable(),
    width: z.number().int().positive().max(2000),
    height: z.number().int().min(1).max(10),
    color: z.enum(STICKY_NOTE_COLORS).optional(),
    imageFileId: z.string().uuid().optional().nullable(),
    kind: CommentKindSchema.optional(),
    parent: CommentParentSchema.nullable().optional(),
    skipMentionNotifications: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const kind = data.kind ?? 'text';
    if (kind === 'image' || kind === 'diagram') {
      if (!data.imageFileId) {
        ctx.addIssue({
          code: 'custom',
          message: 'imageFileId is required',
          path: ['imageFileId'],
        });
      }
      return;
    }
    if (data.text.trim().length < 1) {
      ctx.addIssue({ code: 'custom', message: 'text is required', path: ['text'] });
    }
  });

export const CommentReactionToggleSchema = z.object({
  emoji: z.string().trim().min(1).max(MAX_STICKY_NOTE_REACTION_EMOJI_LENGTH),
});

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: false; error: z.ZodError } | { success: true; data: T } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

export function formatValidationError(error: z.ZodError<unknown>): string {
  return error.issues
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}

export const CreateIssueSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  assignee: z.string().optional(),
  queue: z.string().min(1),
  parent: z.string().min(1).optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  sprintId: z.number().int().positive().optional(),
});

export const UpdateIssueSchema = z.object({
  summary: z.string().min(1).optional(),
  description: z.string().optional(),
  /** Ключ родителя; `null` — снять родителя */
  parent: z.union([z.string().min(1), z.null()]).optional(),
  /** Спринт планера, чтобы сразу поправить кэш списка задач */
  sprintId: z.number().int().positive().optional(),
}).refine(
  (data) =>
    data.summary !== undefined || data.description !== undefined || data.parent !== undefined,
  {
    message: 'At least one of summary, description or parent must be provided',
  }
);

export const AddChecklistItemSchema = z.object({
  text: z.string().min(1),
  checked: z.boolean().optional().default(false),
});

export const UpdateChecklistItemSchema = z.object({
  checked: z.boolean().optional(),
  text: z.string().min(1).optional(),
}).refine(
  (data) => data.checked !== undefined || data.text !== undefined,
  {
    message: 'At least one of checked or text must be provided',
  }
);

export const UpdateChecklistOrderSchema = z.object({
  items: z.array(z.unknown()).min(1),
});

export const CreateRelatedIssueSchema = z.object({
  title: z.string().min(1),
  storyPoints: z.number().int().nonnegative().nullable().optional(),
  testPoints: z.number().int().nonnegative().nullable().optional(),
  sprintId: z.number().int().positive().nullable().optional(),
  assignee: z.string().optional(),
  priority: z.string().optional(),
  functionalTeam: z.string().optional(),
  productTeam: z.array(z.string()).optional(),
  stage: z.string().optional(),
  parent: z.string().optional(),
  type: z.string().optional(),
});

export const AddIssueToSprintSchema = z.object({
  sprintId: z.number().int().positive(),
});

export const UpdateIssueSprintSchema = z.object({
  sprint: z.array(
    z.union([
      z.number().int().positive(),
      z.string(),
      z.object({
        id: z.union([z.number().int().positive(), z.string()]),
      }),
    ])
  ),
});

export const BoardIdQuerySchema = z.object({
  boardId: z.string().min(1),
});

export const SprintIdQuerySchema = z.object({
  sprintId: z.string().min(1),
});

export const IssueKeyParamSchema = z.object({
  issueKey: z.string().min(1).max(50),
});

export const StoryKeyParamSchema = z.object({
  storyKey: z.string().min(1).max(50),
});

export const BacklogQuerySchema = z.object({
  boardId: z.string().min(1),
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .default('1')
    .transform((v) => parseInt(v, 10)),
  perPage: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .default('50')
    .transform((v) => parseInt(v, 10)),
});

export const BatchPositionsSchema = z.object({
  positions: z.array(TaskPositionSchema).min(1).max(1000),
});

export const BatchLinksSchema = z.object({
  links: z.array(TaskLinkSchema).min(1).max(1000),
});

const MAX_DOCUMENT_CONTENT_SIZE = 10 * 1024 * 1024;

export const CreateFeatureSchema = z.object({
  boardId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  description: z.string().max(10000).optional().default(''),
  status: z.enum(['draft', 'planned', 'in_progress', 'completed']).optional().default('draft'),
  responsibleByPlatform: z.object({
    web: z.string().max(255).optional(),
    back: z.string().max(255).optional(),
    qa: z.string().max(255).optional(),
  }).optional().default({}),
});

export const UpdateFeatureSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['draft', 'planned', 'in_progress', 'completed']).optional(),
  responsibleByPlatform: z.object({
    web: z.string().max(255).optional(),
    back: z.string().max(255).optional(),
    qa: z.string().max(255).optional(),
  }).optional(),
  tasks: z.array(z.unknown()).optional(), // Задачи валидируются отдельно
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);

export const CreateDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['markdown', 'diagram', 'test-plan']),
  content: z.unknown().optional(),
}).refine(
  (data) => {
    if (data.content === undefined) return true;
    const contentString = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
    const contentSize = new Blob([contentString || '']).size;
    return contentSize <= MAX_DOCUMENT_CONTENT_SIZE;
  },
  {
    message: `Document content exceeds maximum size of ${MAX_DOCUMENT_CONTENT_SIZE} bytes`,
  }
);

export const UpdateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().max(MAX_DOCUMENT_CONTENT_SIZE).optional(),
}).refine(
  (data) => {
    if (data.content !== undefined) {
      const contentSize = new Blob([data.content]).size;
      return contentSize <= MAX_DOCUMENT_CONTENT_SIZE;
    }
    return true;
  },
  {
    message: `Document content exceeds maximum size of ${MAX_DOCUMENT_CONTENT_SIZE} bytes`,
  }
).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);

export const CreateDiagramSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.unknown().optional().default({}),
});

export const UpdateDiagramSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.unknown().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);

export const ReorderDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(1000),
});

export const ReorderDiagramsSchema = z.object({
  diagramIds: z.array(z.string().uuid()).min(1).max(1000),
});

export const IssueSearchQuerySchema = z.object({
  boardId: z.coerce.number().int().positive(),
  parentCandidates: z.enum(['1', 'true']).optional(),
  q: z.string().min(1).max(200),
});

export const QueueSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

export const FeatureLanesDocumentSchema = z.object({
  draftRows: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(255),
        issueKeys: z.array(z.string().trim().min(1).max(80)).max(500).optional(),
      })
    )
    .max(200),
  hiddenIds: z.array(z.string().trim().min(1).max(255)).max(500),
  orderIds: z.array(z.string().trim().min(1).max(255)).max(500),
});

