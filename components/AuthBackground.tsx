'use client';

import type { ReactNode } from 'react';

import { LanguageSelector } from '@/components/LanguageSelector';

/** Светлая тема: холодные нейтрали, без жёлтого акцента на весь экран. */
const LIGHT_AUTH_BG =
  'linear-gradient(165deg, #f0f9ff 0%, #e8f4fc 42%, #f1f5f9 78%, #f8fafc 100%)';

const DARK_AUTH_BG =
  'linear-gradient(165deg, #0f172a 0%, #1e293b 30%, #1e3a5f 60%, #0f172a 100%)';

export function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{ background: LIGHT_AUTH_BG }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{ background: DARK_AUTH_BG }}
      />
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSelector />
      </div>
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}
