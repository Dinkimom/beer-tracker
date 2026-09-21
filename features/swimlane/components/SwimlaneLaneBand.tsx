'use client';

import type { CSSProperties, ReactNode } from 'react';

type SwimlaneLaneBandAccent = 'calendar' | 'fact';

const ACCENT_BAND_CLASS: Record<SwimlaneLaneBandAccent, string> = {
  // Sky: лёгкий синий, отличен от нейтральной полосы факта и от цветных status-баров
  calendar:
    'border-t border-sky-500/25 bg-sky-500/[0.07] dark:border-sky-400/20 dark:bg-sky-400/[0.09]',
  // Нейтральный фон: в факте уже цветные статусы — полоса не должна добавлять ещё один акцент
  fact: 'border-t border-ds-border-subtle bg-gray-500/[0.04] dark:bg-white/[0.04]',
};

interface SwimlaneLaneBandProps {
  accent: SwimlaneLaneBandAccent;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Визуальная «дорожка» вторичного слоя свимлейна: оттенок фона и разделитель.
 * Подписи слоёв — в колонке исполнителя (`DeveloperHeaderLaneLabels`, у границы с таймлайном), не на таймлайне.
 */
export function SwimlaneLaneBand({
  accent,
  children,
  className = '',
  style,
}: SwimlaneLaneBandProps) {
  // Не задаём position здесь: callers передают `absolute` через className.
  // `relative` + `absolute` в одном className — конфликт Tailwind (побеждает порядок в CSS).
  return (
    <div className={`${ACCENT_BAND_CLASS[accent]} ${className}`.trim()} style={style}>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
