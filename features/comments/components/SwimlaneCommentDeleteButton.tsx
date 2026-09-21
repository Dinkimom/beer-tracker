'use client';

/**
 * Кнопка удаления заметки на свимлейне (правый верхний угол стикера).
 */

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { MouseEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { getStickyNoteCardStyle } from '@/features/comments/utils/stickyNotePalette';
import { getStickyNoteDeleteButtonClasses } from '@/features/comments/utils/stickyNoteSurfaceClasses';
import { getDiagramCardDeleteButtonStyle } from '@/features/task/utils/diagramCardSurface';
import { getPhotoCardDeleteButtonStyle } from '@/features/task/utils/photoCardSurface';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

type AnnotationDeleteSurface = 'diagram' | 'photo' | 'sticky';

interface SwimlaneCommentDeleteButtonProps {
  color?: StickyNoteColor | string | null;
  surface?: AnnotationDeleteSurface;
  onDelete: (e: MouseEvent) => void;
}

function resolveDeleteButtonPaint(
  surface: AnnotationDeleteSurface,
  color: StickyNoteColor | string | null | undefined,
  isDark: boolean
) {
  if (surface === 'diagram') {
    return getDiagramCardDeleteButtonStyle(isDark);
  }
  if (surface === 'photo') {
    return getPhotoCardDeleteButtonStyle(isDark);
  }
  return getStickyNoteCardStyle(color, isDark);
}

export function SwimlaneCommentDeleteButton({
  color,
  onDelete,
  surface = 'sticky',
}: SwimlaneCommentDeleteButtonProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const paint = resolveDeleteButtonPaint(surface, color, isDark);
  return (
    <Button
      aria-label={t('comments.deleteAria')}
      className={getStickyNoteDeleteButtonClasses()}
      style={{
        zIndex: ZIndex.popupContent,
        backgroundColor: paint.backgroundColor,
        borderColor: paint.borderColor,
        color: paint.color,
      }}
      type="button"
      variant="ghost"
      onClick={onDelete}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      <Icon className="!h-2.5 !w-2.5" name="close" size="sm" />
    </Button>
  );
}
