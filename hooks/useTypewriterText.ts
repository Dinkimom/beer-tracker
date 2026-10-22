'use client';

import { useEffect, useState } from 'react';

import { AGENT_TYPEWRITER_TICK_MS, nextTypewriterCut } from '@/lib/agentSessions/agentTypewriter';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Текст, который «допечатывается» по словам. Без `enabled` и при reduced motion — сразу целиком.
 * `done` — печать закончена (можно показать то, что идёт под текстом).
 */
export function useTypewriterText(text: string, enabled: boolean): { done: boolean; shown: string } {
  const [cut, setCut] = useState(() => (enabled && !prefersReducedMotion() ? 0 : text.length));
  const done = cut >= text.length;

  useEffect(() => {
    if (done) {
      return;
    }
    const timer = window.setTimeout(
      () => setCut((prev) => nextTypewriterCut(text, prev)),
      AGENT_TYPEWRITER_TICK_MS
    );
    return () => window.clearTimeout(timer);
  }, [cut, done, text]);

  return { done, shown: done ? text : text.slice(0, cut) };
}
