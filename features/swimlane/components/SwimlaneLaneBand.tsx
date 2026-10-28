'use client';

import type { CSSProperties, ReactNode } from 'react';

type SwimlaneLaneBandAccent = 'fact';

const ACCENT_BORDER_CLASS: Record<SwimlaneLaneBandAccent, string> = {
  fact: 'border-t border-ds-border-subtle',
};

const ACCENT_FILL_CLASS: Record<SwimlaneLaneBandAccent, string> = {
  // Нейтральный фон: в факте уже цветные статусы — полоса не должна добавлять ещё один акцент
  fact: 'bg-gray-500/[0.04] dark:bg-white/[0.04]',
};

interface SwimlaneLaneBandProps {
  accent: SwimlaneLaneBandAccent;
  children?: ReactNode;
  className?: string;
  /**
   * Стили внешней рамки (высота, позиция). Маску «дыр» по дням (выходные / отсутствие)
   * тоже сюда — иначе `border-t` останется поверх штриховки.
   */
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
    <div className={`${ACCENT_BORDER_CLASS[accent]} ${className}`.trim()} style={style}>
      <div className={`absolute inset-0 ${ACCENT_FILL_CLASS[accent]}`}>{children}</div>
    </div>
  );
}
