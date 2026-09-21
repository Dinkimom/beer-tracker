import { z } from 'zod';

import { MAX_PLANNER_DAY_INDEX } from '@/constants';
import { validatePlannerImageBytes } from '@/lib/planner/plannerImageFile';

const ImageCommentMetaSchema = z.object({
  assigneeId: z.string().min(1).max(255),
  caption: z.string().max(5000).optional(),
  day: z.coerce.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
  height: z.coerce.number().int().positive().max(2000).optional(),
  id: z.string().uuid().optional(),
  part: z.coerce.number().int().min(0).max(2),
  width: z.coerce.number().int().positive().max(2000).optional(),
});

type ParsedImageCommentForm =
  | {
      ok: true;
      value: {
        assigneeId: string;
        caption: string;
        commentId: string | undefined;
        contentType: string;
        data: Buffer;
        day: number;
        height: number;
        part: number;
        width: number;
      };
    }
  | { error: string; ok: false; status: 400 };

export async function parseSprintImageCommentFormData(
  formData: FormData
): Promise<ParsedImageCommentForm> {
  const file = formData.get('file');
  if (!(file instanceof Blob) || file.size <= 0) {
    return { error: 'Image file is required', ok: false, status: 400 };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const declaredType = typeof file.type === 'string' ? file.type : undefined;
  const validation = validatePlannerImageBytes(data, declaredType);
  if (!validation.ok) {
    return {
      error: validation.reason === 'size' ? 'Image is too large' : 'Unsupported image type',
      ok: false,
      status: 400,
    };
  }
  const meta = ImageCommentMetaSchema.safeParse({
    assigneeId: formData.get('assigneeId'),
    caption: formData.get('caption') ?? '',
    day: formData.get('day'),
    height: formData.get('height') || 1,
    id: emptyToUndefined(formData.get('id')),
    part: formData.get('part'),
    width: formData.get('width') || 2,
  });
  if (!meta.success) {
    return { error: 'Validation failed', ok: false, status: 400 };
  }
  return {
    ok: true,
    value: {
      assigneeId: meta.data.assigneeId,
      caption: meta.data.caption?.trim() ?? '',
      commentId: meta.data.id,
      contentType: validation.contentType,
      data,
      day: meta.data.day,
      height: meta.data.height ?? 1,
      part: meta.data.part,
      width: meta.data.width ?? 2,
    },
  };
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  return value;
}
