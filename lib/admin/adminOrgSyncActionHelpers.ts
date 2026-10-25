import { NextResponse } from 'next/server';
import { z } from 'zod';

import { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';

export async function parseAdminOrgJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  errorMessage: string
): Promise<NextResponse | T> {
  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
  return parsed.data;
}
