import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import { NextResponse } from 'next/server';

const gzipAsync = promisify(gzip);

/** Мельче этого gzip обычно не окупает CPU. */
const JSON_GZIP_MIN_BYTES = 1024;

export function acceptsGzipEncoding(acceptEncoding: string | null | undefined): boolean {
  if (!acceptEncoding) {
    return false;
  }
  return acceptEncoding.split(',').some(isGzipTokenAccepted);
}

function isGzipTokenAccepted(part: string): boolean {
  const [token, ...params] = part.trim().split(';');
  if (token?.trim().toLowerCase() !== 'gzip') {
    return false;
  }
  const qParam = params.find((param) => param.trim().toLowerCase().startsWith('q='));
  if (!qParam) {
    return true;
  }
  const quality = Number.parseFloat(qParam.trim().slice(2));
  return Number.isFinite(quality) && quality > 0;
}

export async function jsonGzipResponse(
  body: unknown,
  acceptEncoding: string | null | undefined
): Promise<NextResponse> {
  const json = JSON.stringify(body);
  if (!acceptsGzipEncoding(acceptEncoding) || Buffer.byteLength(json) < JSON_GZIP_MIN_BYTES) {
    return NextResponse.json(body);
  }
  const compressed = await gzipAsync(json);
  if (compressed.length >= Buffer.byteLength(json)) {
    return NextResponse.json(body);
  }
  return new NextResponse(compressed, {
    headers: {
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/json; charset=utf-8',
      Vary: 'Accept-Encoding',
    },
  });
}
