'use client';

import type { Editor } from '@tiptap/react';

import * as Popover from '@radix-ui/react-popover';
import { useEditorState } from '@tiptap/react';
import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import {
  TOOLBAR_BTN_ACTIVE_CLASS,
  TOOLBAR_BTN_CLASS,
  TOOLBAR_ICON_CLASS,
} from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionToolbarButton';

interface TaskInfoSidebarDescriptionLinkControlProps {
  disabled?: boolean;
  editor: Editor;
}

export function TaskInfoSidebarDescriptionLinkControl({
  disabled = false,
  editor,
}: TaskInfoSidebarDescriptionLinkControlProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const isActive = useEditorState({
    editor,
    selector: (ctx) => ctx.editor.isActive('link'),
  });

  const openEditor = (nextOpen: boolean) => {
    if (disabled) {
      return;
    }
    if (nextOpen) {
      setUrl(String(editor.getAttributes('link').href ?? ''));
    }
    setOpen(nextOpen);
  };

  const applyLink = () => {
    const trimmed = url.trim();
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
    }
    setOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover.Root modal={false} open={open && !disabled} onOpenChange={openEditor}>
      <Popover.Trigger asChild>
        <button
          aria-label={t('sprintPlanner.taskInfo.descriptionEditor.link')}
          aria-pressed={isActive}
          className={`${TOOLBAR_BTN_CLASS} w-8 ${isActive && !disabled ? TOOLBAR_BTN_ACTIVE_CLASS : ''}`}
          disabled={disabled}
          title={t('sprintPlanner.taskInfo.descriptionEditor.link')}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
        >
          <Icon className={TOOLBAR_ICON_CLASS} name="link" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className={`z-[120] w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
          data-description-editor-chrome=""
          sideOffset={6}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const input = (event.currentTarget as HTMLElement).querySelector('input');
            input?.focus();
          }}
        >
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {t('sprintPlanner.taskInfo.descriptionEditor.linkPrompt')}
          </label>
          <input
            className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400"
            placeholder="https://"
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyLink();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            {isActive ? (
              <button
                className="cursor-pointer rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                type="button"
                onClick={removeLink}
              >
                {t('sprintPlanner.taskInfo.descriptionEditor.linkRemove')}
              </button>
            ) : null}
            <button
              className="cursor-pointer rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              type="button"
              onClick={applyLink}
            >
              {t('sprintPlanner.taskInfo.descriptionEditor.linkApply')}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
