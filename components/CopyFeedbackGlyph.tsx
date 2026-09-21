'use client';

import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';

const LAYER_BASE =
  'absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]';

interface CopyFeedbackGlyphProps {
  className?: string;
  copied: boolean;
  /** Кастомный glyph в покое (например логотип GitLab). */
  idle?: ReactNode;
  /** Иконка в покое (если нет кастомного `idle`). */
  idleName?: string;
}

/**
 * Смена idle ↔ галка с fade/scale; цвет наследует от кнопки (без зелёного акцента).
 */
export function CopyFeedbackGlyph({
  className = 'h-4 w-4',
  copied,
  idle,
  idleName,
}: CopyFeedbackGlyphProps) {
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className={`${LAYER_BASE} ${copied ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {idle ?? (idleName ? <Icon className="h-full w-full" name={idleName} /> : null)}
      </span>
      <span
        className={`${LAYER_BASE} ${copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
      >
        <Icon className="h-full w-full" name="check" />
      </span>
    </span>
  );
}
