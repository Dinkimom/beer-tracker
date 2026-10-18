'use client';

import type { RetroCardComment, RetroCommentAuthor } from '@/lib/retro/retroBoard';

import * as Popover from '@radix-ui/react-popover';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { RETRO_COMMENT_MAX_LENGTH } from '@/lib/retro/retroBoard';

import { currentRetroCommentAuthor, RetroCommentItem } from './RetroCommentItem';

const TRIGGER_CLASS =
  'inline-flex h-6 cursor-pointer items-center gap-0.5 rounded-md px-1 text-gray-500 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15';

const PANEL_CLASS = [
  'z-[80] flex w-[min(17.5rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 shadow-lg outline-none',
  'dark:border-white/10 dark:bg-gray-800',
  OVERLAY_FLOATING_ANIMATION,
].join(' ');

const COMPOSER_CLASS =
  'rounded-lg border border-gray-200 bg-white px-2.5 py-2 dark:border-white/15 dark:bg-white/[0.08]';

const FIELD_CLASS =
  'block max-h-24 min-h-10 w-full resize-none bg-transparent text-sm leading-snug text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500';

interface RetroCardCommentsProps {
  comments: readonly RetroCardComment[];
  onAdd: (text: string, author: RetroCommentAuthor) => void;
  onDelete: (commentId: string) => void;
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

function resizeField(field: HTMLTextAreaElement) {
  field.style.height = 'auto';
  field.style.height = `${Math.min(field.scrollHeight, 96)}px`;
}

export function RetroCardComments({ comments, onAdd, onDelete }: RetroCardCommentsProps) {
  const { t } = useI18n();
  const { data: user } = useCurrentUser();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const bindList = useCallback((node: HTMLUListElement | null) => {
    listRef.current = node;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, []);
  const [draft, setDraft] = useState('');
  const count = comments.length;
  const author = currentRetroCommentAuthor(user);
  const label = count > 0 ? t('retro.commentsAria', { count }) : t('retro.addComment');

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [count]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAdd(text, author);
    setDraft('');
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = 'auto';
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
          className={PANEL_CLASS}
          collisionPadding={8}
          side="bottom"
          sideOffset={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            fieldRef.current?.focus();
          }}
          onPointerDown={stopPointer}
        >
          <p className="px-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">{t('retro.comments')}</p>
          {count === 0 ? (
            <p className="px-1 text-sm text-gray-500 dark:text-gray-400">{t('retro.commentsEmpty')}</p>
          ) : (
            <ul ref={bindList} className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
              {orderedComments(comments).map((comment) => (
                <RetroCommentItem
                  key={comment.id}
                  comment={comment}
                  currentUser={user}
                  onDelete={() => onDelete(comment.id)}
                />
              ))}
            </ul>
          )}
          <form className={COMPOSER_CLASS} onSubmit={submit}>
            <textarea
              ref={fieldRef}
              aria-label={t('retro.addComment')}
              className={FIELD_CLASS}
              maxLength={RETRO_COMMENT_MAX_LENGTH}
              placeholder={t('retro.commentPlaceholder')}
              rows={2}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                resizeField(event.target);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              onPointerDown={stopPointer}
            />
            <div className="mt-2 flex justify-end">
              <Button className="!px-2.5 !py-1" disabled={!draft.trim()} type="submit" variant="primary">
                {t('retro.addCommentSubmit')}
              </Button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
