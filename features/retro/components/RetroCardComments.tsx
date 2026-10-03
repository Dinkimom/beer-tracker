'use client';

import type { TrackerMyselfUser } from '@/lib/api/types';
import type { RetroCardComment } from '@/lib/retro/retroBoard';

import * as Popover from '@radix-ui/react-popover';
import { useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { RETRO_COMMENT_MAX_LENGTH } from '@/lib/retro/retroBoard';

const TRIGGER_CLASS =
  'inline-flex h-6 cursor-pointer items-center gap-0.5 rounded-md px-1 text-gray-500 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-300 dark:hover:bg-white/10';

const FIELD_CLASS =
  'block min-h-16 w-full resize-none rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100';

interface RetroCardCommentsProps {
  comments: readonly RetroCardComment[];
  onAdd: (text: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
}

function commentAuthorName(user: TrackerMyselfUser | undefined): string {
  const display = user?.display?.trim();
  if (display) return display;
  const login = user?.login?.trim();
  if (login) return login;
  return user?.email?.trim() ?? '';
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

function orderedComments(comments: readonly RetroCardComment[]): RetroCardComment[] {
  return [...comments].sort((left, right) => {
    if (left.createdAt === right.createdAt) return left.id < right.id ? -1 : 1;
    return left.createdAt < right.createdAt ? -1 : 1;
  });
}

function stopPointer(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function RetroCardComments({ comments, onAdd, onDelete }: RetroCardCommentsProps) {
  const { language, t } = useI18n();
  const { data: user } = useCurrentUser();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const count = comments.length;
  const label = count > 0 ? t('retro.commentsAria', { count }) : t('retro.addComment');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAdd(text, commentAuthorName(user));
    setDraft('');
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={label}
        className={TRIGGER_CLASS}
        type="button"
        onPointerDown={stopPointer}
      >
        <Icon className="h-3.5 w-3.5" name="comment" />
        {count > 0 ? (
          <span aria-hidden className="text-[11px] font-medium tabular-nums">{count}</span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-[80] w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-xl outline-none dark:border-gray-600 dark:bg-gray-900"
          side="bottom"
          sideOffset={6}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            fieldRef.current?.focus();
          }}
          onPointerDown={stopPointer}
        >
          <p className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('retro.comments')}</p>
          {count === 0 ? (
            <p className="px-1 py-2 text-sm text-gray-500 dark:text-gray-400">{t('retro.commentsEmpty')}</p>
          ) : (
            <ul className="mt-1 flex max-h-52 flex-col gap-1 overflow-y-auto">
              {orderedComments(comments).map((comment) => (
                <li key={comment.id} className="group/comment rounded-md px-1 py-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-medium text-gray-800 dark:text-gray-100">
                      {comment.authorName || t('retro.commentAnonymous')}
                    </p>
                    <button
                      aria-label={t('retro.deleteComment')}
                      className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-gray-400 opacity-0 hover:bg-black/5 hover:text-gray-700 group-hover/comment:opacity-100 focus-visible:opacity-100 dark:hover:bg-white/10 dark:hover:text-gray-200"
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      onPointerDown={stopPointer}
                    >
                      <Icon className="h-3 w-3" name="x" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100">
                    {comment.text}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {formatCommentTime(comment.createdAt, language)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <form className="mt-2" onSubmit={submit}>
            <textarea
              ref={fieldRef}
              aria-label={t('retro.addComment')}
              className={FIELD_CLASS}
              maxLength={RETRO_COMMENT_MAX_LENGTH}
              placeholder={t('retro.commentPlaceholder')}
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              onPointerDown={stopPointer}
            />
            <div className="mt-1 flex justify-end">
              <Button className="!px-3 !py-1.5" disabled={!draft.trim()} type="submit" variant="primary">
                {t('retro.addCommentSubmit')}
              </Button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
