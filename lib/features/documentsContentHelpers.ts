import { NextResponse } from 'next/server';

function normalizeJsonbContent(
  content: unknown
): { content: string; ok: true } | { error: NextResponse } {
  if (!content || (typeof content === 'string' && content.trim() === '')) {
    return { ok: true, content: JSON.stringify({}) };
  }
  if (typeof content === 'object' && content !== null) {
    return { ok: true, content: JSON.stringify(content) };
  }
  if (typeof content === 'string') {
    return parseJsonbStringContent(content);
  }
  return { ok: true, content: JSON.stringify({}) };
}

function parseJsonbStringContent(content: string): { content: string; ok: true } | { error: NextResponse } {
  try {
    JSON.parse(content);
    return { ok: true, content };
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Content for JSONB type must be valid JSON string' },
        { status: 400 }
      ),
    };
  }
}

export function normalizeDocumentContent(
  content: unknown,
  contentFormat: string
): { content: string; ok: true } | { error: NextResponse } {
  if (contentFormat === 'jsonb') {
    return normalizeJsonbContent(content);
  }
  if (contentFormat === 'text' && typeof content !== 'string') {
    return { ok: true, content: String(content) };
  }
  return { ok: true, content: typeof content === 'string' ? content : String(content ?? '') };
}
