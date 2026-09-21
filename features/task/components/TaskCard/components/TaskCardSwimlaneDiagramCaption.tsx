'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';

export const DiagramNameEditContext = createContext<((name: string) => void) | undefined>(
  undefined
);

const CAPTION_TEXT_CLASS =
  'min-w-0 flex-1 truncate bg-transparent text-center font-sans text-[10px] font-medium leading-tight tracking-wide outline-none opacity-90';

interface TaskCardSwimlaneDiagramCaptionProps {
  name?: string;
  placeholder: string;
  untitledName: string;
}

function resolveDiagramCaption(name: string | undefined, untitledName: string): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return untitledName;
  }
  return trimmed.replace(/\.excalidraw$/i, '');
}

function stopCardGesture(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}

export function TaskCardSwimlaneDiagramCaption({
  name,
  placeholder,
  untitledName,
}: TaskCardSwimlaneDiagramCaptionProps) {
  const onRename = useContext(DiagramNameEditContext);
  const committedName = name?.trim() ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(committedName);
  const inputRef = useRef<HTMLInputElement>(null);
  const caption = resolveDiagramCaption(name, untitledName);
  const canEdit = onRename != null;

  useEffect(() => {
    if (!editing) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (onRename && next !== committedName) {
      onRename(next);
    }
  };

  const onCaptionClick = (event: MouseEvent) => {
    if (!canEdit) {
      return;
    }
    stopCardGesture(event);
    setDraft(committedName);
    setEditing(true);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    stopCardGesture(event);
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(committedName);
      setEditing(false);
    }
  };

  return (
    <div className="mt-2 flex min-w-0 shrink-0 items-center justify-center gap-1.5 px-0.5">
      <ExcalidrawMark className="h-3.5 w-3.5 shrink-0" />
      {editing ? (
        <input
          ref={inputRef}
          aria-label={placeholder}
          className={CAPTION_TEXT_CLASS}
          placeholder={placeholder}
          value={draft}
          onBlur={commit}
          onChange={(event) => setDraft(event.target.value)}
          onClick={stopCardGesture}
          onKeyDown={onInputKeyDown}
          onMouseDown={stopCardGesture}
          onPointerDown={stopCardGesture}
        />
      ) : (
        <button
          className={`${CAPTION_TEXT_CLASS} border-0 p-0${canEdit ? ' cursor-text' : ''}`}
          type="button"
          onClick={onCaptionClick}
          onMouseDown={canEdit ? stopCardGesture : undefined}
          onPointerDown={canEdit ? stopCardGesture : undefined}
        >
          {caption}
        </button>
      )}
    </div>
  );
}
