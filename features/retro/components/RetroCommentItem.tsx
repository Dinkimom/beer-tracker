'use client';

import type { RetroCardComment, RetroCommentAuthor } from '@/lib/retro/retroBoard';

import { Avatar } from '@/components/Avatar';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { getInitials } from '@/utils/displayUtils';

import { isOwnRetroComment } from '../retroIdentity';

/** Та же поверхность, что у заметки на доске, без внешнего отступа колонки. */
const COMMENT_CARD_CLASS =
  'group/comment relative rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-900 dark:border-white/15 dark:bg-white/[0.08] dark:text-gray-100';

interface RetroCommentItemProps {
  comment: RetroCardComment;
  /** Кто смотрит: свой комментарий можно удалить, у него видна своя аватарка. */
  me: RetroCommentAuthor | null;
  onDelete: () => void;
}

export function RetroCommentItem({ comment, me, onDelete }: RetroCommentItemProps) {
  const { language, t } = useI18n();
  const name = comment.authorName || t('retro.commentAnonymous');
  const timeLabel = formatCommentTime(comment.createdAt, language);

  return (
    <li className={COMMENT_CARD_CLASS}>
      <HeaderIconButton
        aria-label={t('retro.deleteComment')}
        className="absolute right-1 top-1 opacity-0 focus-visible:opacity-100 group-hover/comment:opacity-100"
        size="sm"
        onCanvas
        onClick={onDelete}
        onPointerDown={stopPointer}
      >
        <Icon className="h-3.5 w-3.5" name="x" />
      </HeaderIconButton>
      <div className="flex min-w-0 items-center gap-1.5 pr-6">
        <Avatar
          avatarUrl={visibleAvatarUrl(comment, me)}
          initials={getInitials(name)}
          initialsVariant="default"
          size="xs"
        />
        <p className="min-w-0 truncate text-xs font-medium">{name}</p>
        {timeLabel ? (
          <time className="shrink-0 text-[10px] font-normal text-gray-400 dark:text-gray-500" dateTime={comment.createdAt}>
            {timeLabel}
          </time>
        ) : null}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-snug">{comment.text}</p>
    </li>
  );
}

function visibleAvatarUrl(comment: RetroCardComment, me: RetroCommentAuthor | null): string | null {
  if (comment.authorAvatarUrl) return comment.authorAvatarUrl;
  if (isOwnRetroComment(comment, me)) return me?.avatarUrl ?? null;
  return null;
}

function formatCommentTime(value: string, language: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(language, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

function stopPointer(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
