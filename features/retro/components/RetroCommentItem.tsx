'use client';

import type { TrackerMyselfUser } from '@/lib/api/types';
import type { RetroCardComment, RetroCommentAuthor } from '@/lib/retro/retroBoard';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { getInitials } from '@/utils/displayUtils';

import { retroIconButtonClass } from './retroUi';

/** Та же поверхность, что у заметки на доске, без внешнего отступа колонки. */
const COMMENT_CARD_CLASS =
  'group/comment relative rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-900 dark:border-white/15 dark:bg-white/[0.08] dark:text-gray-100';

interface RetroCommentItemProps {
  comment: RetroCardComment;
  currentUser: TrackerMyselfUser | undefined;
  onDelete: () => void;
}

export function currentRetroCommentAuthor(user: TrackerMyselfUser | undefined): RetroCommentAuthor {
  return {
    avatarUrl: user?.avatarUrl ?? null,
    name: commentAuthorName(user),
    userId: user ? String(user.uid) : undefined,
  };
}

export function RetroCommentItem({ comment, currentUser, onDelete }: RetroCommentItemProps) {
  const { language, t } = useI18n();
  const name = comment.authorName || t('retro.commentAnonymous');
  const timeLabel = formatCommentTime(comment.createdAt, language);

  return (
    <li className={COMMENT_CARD_CLASS}>
      <button
        aria-label={t('retro.deleteComment')}
        className={`${retroIconButtonClass} absolute right-1 top-1 opacity-0 focus-visible:opacity-100 group-hover/comment:opacity-100`}
        type="button"
        onClick={onDelete}
        onPointerDown={stopPointer}
      >
        <Icon className="h-3.5 w-3.5" name="x" />
      </button>
      <div className="flex min-w-0 items-center gap-1.5 pr-6">
        <Avatar
          avatarUrl={visibleAvatarUrl(comment, currentUser)}
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

function commentAuthorName(user: TrackerMyselfUser | undefined): string {
  const display = user?.display?.trim();
  if (display) return display;
  const login = user?.login?.trim();
  if (login) return login;
  return user?.email?.trim() ?? '';
}

function isOwnComment(comment: RetroCardComment, user: TrackerMyselfUser | undefined): boolean {
  if (!user) return false;
  if (comment.authorId) return comment.authorId === String(user.uid);
  const name = commentAuthorName(user);
  return name.length > 0 && comment.authorName === name;
}

function visibleAvatarUrl(
  comment: RetroCardComment,
  user: TrackerMyselfUser | undefined
): string | null {
  if (comment.authorAvatarUrl) return comment.authorAvatarUrl;
  if (isOwnComment(comment, user)) return user?.avatarUrl ?? null;
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
