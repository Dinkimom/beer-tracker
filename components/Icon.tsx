'use client';

import React from 'react';

import { iconGlyphs } from './iconGlyphs';
import { iconGlyphsMore, iconOffsets } from './iconGlyphsMore';
import { iconSizeClassName } from './iconSizeClassName';

interface IconProps {
  className?: string;
  name: string;
  /** Условный размер иконки, если className не передан */
  size?: 'lg' | 'md' | 'sm';
}

const icons: Record<string, React.ReactNode> = {
  ...iconGlyphs,
  ...iconGlyphsMore,
};

/**
 * Универсальный компонент для отображения SVG иконок
 * Рендерит SVG напрямую для поддержки currentColor и CSS стилизации
 */
export function Icon({ name, className, size = 'md' }: IconProps) {
  const iconContent = icons[name];

  if (!iconContent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  const offset = iconOffsets[name];

  // Для иконок sun, moon, tree и sparkles используем fill, для остальных - stroke
  const useFill = name === 'sun' || name === 'moon' || name === 'tree' || name === 'sparkles';

  const computedClassName = className ?? iconSizeClassName(size);

  return (
    <svg
      className={computedClassName}
      fill={useFill ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {offset ? (
        <g transform={`translate(${offset[0]}, ${offset[1]})`}>
          {iconContent}
        </g>
      ) : (
        iconContent
      )}
    </svg>
  );
}
