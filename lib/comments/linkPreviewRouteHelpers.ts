import { NextResponse } from 'next/server';

import { resolveLinkPreview } from '@/lib/comments/linkPreview';
import { inspectLinkPreviewTarget } from '@/lib/comments/linkPreviewSafety';

export async function handleLinkPreviewGet(urlParam: string | null): Promise<NextResponse> {
  const inspected = inspectLinkPreviewTarget(urlParam);
  if (!inspected.ok) {
    return NextResponse.json({ error: inspected.error }, { status: 400 });
  }
  const preview = await resolveLinkPreview(inspected.url.href);
  return NextResponse.json(preview, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
}
