'use client';

import type { AnimationEvent } from 'react';

import { useLayoutEffect, useRef } from 'react';

import { Icon } from '@/components/Icon';

interface ThemeToggleIconProps {
  theme: 'dark' | 'light';
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function ThemeToggleIcon({ theme }: ThemeToggleIconProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const themeRef = useRef(theme);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || themeRef.current === theme) {
      return;
    }
    themeRef.current = theme;
    if (prefersReducedMotion()) {
      return;
    }
    root.classList.remove('theme-toggle-icon--play');
    root.getBoundingClientRect();
    root.classList.add('theme-toggle-icon--play');
  }, [theme]);

  const handleAnimationEnd = (event: AnimationEvent<HTMLSpanElement>) => {
    if (!event.animationName.startsWith('theme-toggle')) {
      return;
    }
    event.currentTarget.classList.remove('theme-toggle-icon--play');
  };

  return (
    <span
      ref={rootRef}
      aria-hidden
      className="theme-toggle-icon"
      data-theme={theme}
      onAnimationEnd={handleAnimationEnd}
    >
      <Icon className="theme-toggle-icon__glyph theme-toggle-icon__sun" name="sun" />
      <Icon className="theme-toggle-icon__glyph theme-toggle-icon__moon" name="moon" />
    </span>
  );
}
