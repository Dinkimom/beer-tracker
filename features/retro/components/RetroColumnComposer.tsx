'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { retroIconButtonClass } from './retroUi';

interface RetroColumnComposerProps {
  onAddNote: (text: string) => void;
}

export function RetroColumnComposer({ onAddNote }: RetroColumnComposerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);

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
    setDraft('');
  };

  return (
    <div className="px-2.5 pb-2">
      {open ? (
        <form onSubmit={submitNote}>
          <textarea
            ref={fieldRef}
            aria-label={t('retro.addCard')}
            className="block min-h-16 w-full resize-none rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            placeholder={t('retro.addCardPlaceholder')}
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
          <div className="mt-1 flex items-center gap-1">
            <Button className="!px-3 !py-1.5" disabled={!draft.trim()} type="submit" variant="primary">
              {t('retro.addCardSubmit')}
            </Button>
            <button aria-label={t('retro.cancel')} className={retroIconButtonClass} type="button" onClick={close}>
              <Icon className="h-4 w-4" name="x" />
            </button>
          </div>
        </form>
      ) : (
        <button
          className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-500 transition-all duration-200 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 active:scale-[0.98]"
          type="button"
          onClick={() => setOpen(true)}
        >
          <Icon className="h-4 w-4" name="plus" />
          {t('retro.addCard')}
        </button>
      )}
    </div>
  );
}
