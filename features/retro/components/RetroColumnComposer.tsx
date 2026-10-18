'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { retroIconButtonClass } from './retroUi';

const FIELD_CLASS = 'w-full whitespace-pre-wrap break-words text-left text-sm leading-snug';

const DRAFT_CARD_CLASS =
  'rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-900 dark:border-white/15 dark:bg-white/[0.08] dark:text-gray-100';

interface RetroColumnComposerProps {
  onAddNote: (text: string) => void;
}

export function RetroColumnComposer({ onAddNote }: RetroColumnComposerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = t('retro.addNotePlaceholder');

  const close = () => {
    setOpen(false);
    setDraft('');
  };

  useEffect(() => {
    if (!open) return;
    fieldRef.current?.focus();
  }, [open]);

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddNote(text);
    close();
  };

  if (!open) {
    return (
      <button
        className="mx-2 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-500 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 dark:text-gray-400 dark:hover:bg-white/10 dark:active:bg-white/15"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Icon className="h-4 w-4" name="plus" />
        {t('retro.addCard')}
      </button>
    );
  }

  return (
    <form className={`mx-2 ${DRAFT_CARD_CLASS}`} onSubmit={submitNote}>
      <div className="grid w-full grid-cols-1">
        <div aria-hidden className={`invisible col-start-1 row-start-1 min-h-10 ${FIELD_CLASS}`}>
          {draft || placeholder}
        </div>
        <textarea
          ref={fieldRef}
          aria-label={t('retro.addCard')}
          className={`col-start-1 row-start-1 min-h-10 resize-none overflow-hidden bg-transparent outline-none placeholder:text-gray-400 ${FIELD_CLASS}`}
          placeholder={placeholder}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
            if (event.key === 'Escape') close();
          }}
        />
      </div>
      <div className="mt-2 flex items-center gap-1">
        <Button className="!px-2.5 !py-1" disabled={!draft.trim()} type="submit" variant="primary">
          {t('retro.addCardSubmit')}
        </Button>
        <button aria-label={t('retro.cancel')} className={retroIconButtonClass} type="button" onClick={close}>
          <Icon className="h-4 w-4" name="x" />
        </button>
      </div>
    </form>
  );
}
