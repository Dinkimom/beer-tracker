'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Developer } from '@/types';
import type { CSSProperties, MouseEvent, SyntheticEvent } from 'react';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteRichEditor } from '@/features/comments/components/StickyNoteRichEditor';
import { getStickyNoteCardStyle } from '@/features/comments/utils/stickyNotePalette';
import {
  getStickyNoteLocalDraftSurfaceClasses,
  resolveStickyNoteDisplayModes,
} from '@/features/comments/utils/stickyNoteSurfaceClasses';
import {
  CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS,
  CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS,
  CARD_FLOATING_TOOLBAR_NEUTRAL_BUTTON_CLASS,
  CardFloatingToolbar,
  handleCardFloatingToolbarActionClick,
} from '@/features/context-menu/components/CardFloatingToolbar';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import { TaskBarDraftNoteColorDropdown } from './TaskBarDraftNoteColorDropdown';

const FOCUS_MOTION_MS = 320;
const FOCUS_MOTION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Во сколько раз максимум увеличивается лист: дальше текст становится плакатом. */
const FOCUS_MAX_SCALE = 2.5;
/** Отступ развёрнутого листа от краёв окна: лист растёт до них, но не впритык. */
const FOCUS_VIEWPORT_GUTTER = 64;
/** Место под тулбаром развёрнутой заметки. */
const FOCUS_TOOLBAR_SPACE = 48;
const FOCUS_TOOLBAR_GAP = 8;

/** Лист на доске: layout-размер (без поворота), центр и наклон. */
interface NoteFocusSource {
  centerX: number;
  centerY: number;
  height: number;
  tiltDeg: number;
  width: number;
}

interface NoteFocusPose {
  centerX: number;
  centerY: number;
  rotateDeg: number;
  scale: number;
}

interface Viewport {
  height: number;
  width: number;
}

/**
 * Поза развёрнутой заметки: тот же лист, только крупнее и ровно по центру.
 * Форма сохраняется — масштаб один на обе оси: лист растёт до краёв окна (с отступом и
 * запасом под тулбар), но не больше FOCUS_MAX_SCALE.
 */
/**
 * Высота развёрнутого листа: вытягивается под содержимое, чтобы в фокусе был виден весь
 * текст, но не выше, чем помещается на экране без уменьшения. Ширина — как у карточки.
 */
export function resolveNoteFocusHeight(
  cardHeight: number,
  contentHeight: number,
  viewport: Viewport
): number {
  const availableHeight = viewport.height - FOCUS_VIEWPORT_GUTTER * 2 - FOCUS_TOOLBAR_SPACE;
  return Math.max(cardHeight, Math.min(Math.ceil(contentHeight), availableHeight));
}

export function resolveNoteFocusPose(
  card: { height: number; width: number },
  viewport: Viewport
): NoteFocusPose {
  const availableWidth = viewport.width - FOCUS_VIEWPORT_GUTTER * 2;
  const availableHeight = viewport.height - FOCUS_VIEWPORT_GUTTER * 2 - FOCUS_TOOLBAR_SPACE;
  const fit = Math.min(availableWidth / Math.max(1, card.width), availableHeight / Math.max(1, card.height));
  const scale = Math.max(0.1, Math.min(FOCUS_MAX_SCALE, fit));
  return {
    centerX: viewport.width / 2,
    centerY: (viewport.height - FOCUS_TOOLBAR_SPACE) / 2,
    rotateDeg: 0,
    scale,
  };
}

function readViewport(): Viewport {
  return { height: window.innerHeight, width: window.innerWidth };
}

function readTiltDeg(anchor: HTMLElement): number {
  const raw = getComputedStyle(anchor).getPropertyValue('--sticky-note-tilt').trim();
  const tilt = Number.parseFloat(raw);
  return Number.isFinite(tilt) ? tilt : 0;
}

function readSource(anchor: HTMLElement | null, fallback: NoteFocusSource): NoteFocusSource {
  if (!anchor) {
    return fallback;
  }
  // Центр повёрнутого листа совпадает с центром его bbox; размер берём layout-ный.
  const rect = anchor.getBoundingClientRect();
  return {
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    height: anchor.offsetHeight,
    tiltDeg: readTiltDeg(anchor),
    width: anchor.offsetWidth,
  };
}

function sourcePose(source: NoteFocusSource): NoteFocusPose {
  return { centerX: source.centerX, centerY: source.centerY, rotateDeg: source.tiltDeg, scale: 1 };
}

function poseTransform(pose: NoteFocusPose, size: { height: number; width: number }): string {
  const left = pose.centerX - size.width / 2;
  const top = pose.centerY - size.height / 2;
  return `translate(${left}px, ${top}px) rotate(${pose.rotateDeg}deg) scale(${pose.scale})`;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stopBoardEvent(event: SyntheticEvent): void {
  event.stopPropagation();
}

interface TaskBarNoteFocusEditorProps {
  developers?: readonly Developer[];
  editor: {
    color?: StickyNoteColor;
    placeholder?: string;
    value: string;
    onCancel?: () => void;
    onChange: (value: string) => void;
    onColorChange?: (color: StickyNoteColor) => void;
    onSubmit?: () => void;
  };
  /** Лист заметки на доске: отсюда заметка выезжает и сюда возвращается. */
  getAnchor: () => HTMLElement | null;
  onCollapse: () => void;
}

/**
 * Режим фокуса заметки: копия листа (тот же размер, наклон и раскладка текста) выезжает
 * со своего места в центр и увеличивается одним transform — текст не перестраивается.
 * Сохранение, отмена или «вернуть» сначала доигрывают обратный полёт, потом выполняют действие.
 */
export function TaskBarNoteFocusEditor({
  developers = [],
  editor,
  getAnchor,
  onCollapse,
}: TaskBarNoteFocusEditorProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const closeTimerRef = useRef<number | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<NoteFocusSource>(() =>
    readSource(getAnchor(), {
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
      height: 120,
      tiltDeg: 0,
      width: 200,
    })
  );
  const [viewport, setViewport] = useState(readViewport);
  const [motionMs] = useState(() => (prefersReducedMotion() ? 0 : FOCUS_MOTION_MS));
  const { lineHeightClass, textSize } = resolveStickyNoteDisplayModes();

  useEffect(() => {
    // Два кадра: первый рисует копию ровно поверх листа, второй запускает полёт в центр.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsOpen(true);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  // Сколько листу нужно по высоте, чтобы текст не прокручивался: рамка + всё содержимое.
  const measureContent = () => {
    const paper = paperRef.current;
    const scroller = paper?.querySelector<HTMLElement>('[data-note-editor-scroll]');
    if (paper && scroller) {
      setContentHeight(paper.offsetHeight - scroller.clientHeight + scroller.scrollHeight);
    }
  };

  const closeThen = (action?: () => void) => {
    if (closeTimerRef.current != null) {
      return;
    }
    // Доска могла прокрутиться, пока заметка была развёрнута: летим в актуальное место.
    setSource((prev) => readSource(getAnchor(), prev));
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      action?.();
    }, motionMs);
  };
  const canSubmit = editor.value.trim().length > 0;
  const submit = () => {
    if (canSubmit && editor.onSubmit) {
      closeThen(editor.onSubmit);
    }
  };
  const cancel = () => closeThen(editor.onCancel);
  const collapse = () => closeThen(onCollapse);

  const focusSize = {
    height: resolveNoteFocusHeight(source.height, contentHeight, viewport),
    width: source.width,
  };
  const focusPose = resolveNoteFocusPose(focusSize, viewport);
  const pose = isOpen ? focusPose : sourcePose(source);
  const size = isOpen ? focusSize : source;
  const motionStyle: CSSProperties = {
    transitionDuration: `${motionMs}ms`,
    transitionTimingFunction: FOCUS_MOTION_EASING,
  };
  const toolbarStyle: CSSProperties = {
    ...motionStyle,
    opacity: isOpen ? 1 : 0,
    // Тулбар проявляется, когда лист почти долетел, и гаснет сразу на обратном пути.
    transitionDelay: isOpen ? `${Math.round(motionMs * 0.6)}ms` : '0ms',
    right: viewport.width - (focusPose.centerX + (focusSize.width * focusPose.scale) / 2),
    top: focusPose.centerY + (focusSize.height * focusPose.scale) / 2 + FOCUS_TOOLBAR_GAP,
    zIndex: ZIndex.contextMenu,
  };

  return createPortal(
    <div
      aria-label={editor.placeholder}
      aria-modal="true"
      role="dialog"
      onClick={stopBoardEvent}
      onContextMenu={stopBoardEvent}
      onDoubleClick={stopBoardEvent}
      onKeyDown={stopBoardEvent}
      onMouseDown={stopBoardEvent}
      onPointerDown={stopBoardEvent}
    >
      <div
        className="fixed inset-0 bg-black/25 transition-opacity dark:bg-black/50"
        style={{ ...motionStyle, opacity: isOpen ? 1 : 0, zIndex: ZIndex.contextMenu }}
        onClick={collapse}
      />
      <div
        className="fixed left-0 top-0 origin-center transition-[transform,height]"
        style={{
          ...motionStyle,
          height: size.height,
          transform: poseTransform(pose, size),
          width: size.width,
          zIndex: ZIndex.contextMenu,
        }}
      >
        <div
          ref={paperRef}
          className={`relative flex h-full w-full flex-col ${getStickyNoteLocalDraftSurfaceClasses()}`}
          // Наклон задаёт поза обёртки: лист выпрямляется по пути в центр и наклоняется обратно.
          style={{ ...getStickyNoteCardStyle(editor.color, isDark), '--sticky-note-tilt': '0deg' } as CSSProperties}
        >
          <div className="relative h-full min-h-0 flex-1 overflow-hidden">
            <StickyNoteRichEditor
              className={`${textSize} ${lineHeightClass}`}
              developers={developers}
              placeholder={editor.placeholder}
              value={editor.value}
              onCancel={cancel}
              onChange={editor.onChange}
              onContentResize={measureContent}
              onSubmit={submit}
            />
          </div>
        </div>
      </div>
      <div className="fixed transition-opacity" style={toolbarStyle}>
        <CardFloatingToolbar placement="none">
          {editor.color && editor.onColorChange ? (
            <TaskBarDraftNoteColorDropdown value={editor.color} onChange={editor.onColorChange} />
          ) : null}
          <Button
            aria-label={t('sprintPlanner.swimlane.placementToolbar.noteCollapse')}
            className={CARD_FLOATING_TOOLBAR_NEUTRAL_BUTTON_CLASS}
            title={t('sprintPlanner.swimlane.placementToolbar.noteCollapse')}
            type="button"
            variant="ghost"
            onClick={(event: MouseEvent) => handleCardFloatingToolbarActionClick(event, collapse)}
          >
            <Icon className="h-3.5 w-3.5" name="minimize" />
          </Button>
          <Button
            aria-label={t('common.confirm')}
            className={CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS}
            disabled={!canSubmit}
            title={t('common.confirm')}
            type="button"
            variant="ghost"
            onClick={(event: MouseEvent) => handleCardFloatingToolbarActionClick(event, submit)}
          >
            <Icon className="h-3.5 w-3.5" name="check" />
          </Button>
          {editor.onCancel ? (
            <Button
              aria-label={t('common.cancel')}
              className={CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS}
              title={t('common.cancel')}
              type="button"
              variant="ghost"
              onClick={(event: MouseEvent) => handleCardFloatingToolbarActionClick(event, cancel)}
            >
              <Icon className="h-3.5 w-3.5" name="x" />
            </Button>
          ) : null}
        </CardFloatingToolbar>
      </div>
    </div>,
    document.body
  );
}
