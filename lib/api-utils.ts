import type { NextRequest } from 'next/server';

import { resolveParams } from '@/lib/nextjs-utils';

export function getQueryParam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key);
}

export async function getRouteParam<
  T extends Record<string, string>,
  K extends string & keyof T,
>(params: Promise<T> | T, key: K): Promise<T[K] | null> {
  const resolved = await resolveParams(params);
  return (resolved[key] as T[K]) ?? null;
}

