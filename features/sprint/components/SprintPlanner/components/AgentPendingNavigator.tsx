'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const PENDING_SELECTOR = '[data-agent-pending-approval]';
const FOCUS_ATTR = 'data-agent-pending-focus';
const FOCUS_MS = 1400;
/** Сколько ждать, пока раскрытый сайдбар смонтирует тулбары целей. */
const REVEAL_POLL_MS = 50;
const REVEAL_TIMEOUT_MS = 1500;

const ARROW_CLASS =
  'inline-flex h-6 w-5 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-500/[0.12] hover:text-gray-800 active:bg-gray-500/[0.18] dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100';

function pendingNodes(): Element[] {
  return [...document.querySelectorAll(PENDING_SELECTOR)];
}

/**
 * «‹ 2 / 5 ›» как у Cursor при правках файлов: сколько правок агента ждёт решения
 * и переход между ними. Пункты ищутся по тулбару ✓/✗ в DOM — свимлейн и сайдбар целей.
 * Цели при закрытом сайдбаре (или другой вкладке) не смонтированы: они идут в конце счёта,
 * и переход к ним зовёт `onRevealHidden` и ждёт, пока тулбар появится.
 */
export function AgentPendingNavigator({
  total,
  onRevealHidden,
}: {
  total: number;
  onRevealHidden?: () => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedRef = useRef<Element | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (focusTimerRef.current != null) {
        clearTimeout(focusTimerRef.current);
      }
      if (revealTimerRef.current != null) {
        clearTimeout(revealTimerRef.current);
      }
      focusedRef.current?.removeAttribute(FOCUS_ATTR);
    },
    []
  );

  if (total <= 0) {
    return null;
  }
  const current = Math.min(index, total - 1);

  const focusNode = (node: Element) => {
    node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    focusedRef.current?.removeAttribute(FOCUS_ATTR);
    node.setAttribute(FOCUS_ATTR, '');
    focusedRef.current = node;
    if (focusTimerRef.current != null) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => {
      node.removeAttribute(FOCUS_ATTR);
      focusTimerRef.current = null;
    }, FOCUS_MS);
  };

  const revealAndFocus = (target: number) => {
    onRevealHidden?.();
    if (revealTimerRef.current != null) {
      clearTimeout(revealTimerRef.current);
    }
    const deadline = Date.now() + REVEAL_TIMEOUT_MS;
    const poll = () => {
      const nodes = pendingNodes();
      const node = nodes[target];
      if (node) {
        revealTimerRef.current = null;
        focusNode(node);
        return;
      }
      if (Date.now() >= deadline) {
        revealTimerRef.current = null;
        const fallback = nodes.at(-1);
        if (fallback) {
          focusNode(fallback);
        }
        return;
      }
      revealTimerRef.current = setTimeout(poll, REVEAL_POLL_MS);
    };
    poll();
  };

  const go = (step: number) => {
    // Первое нажатие «›» ведёт к первой правке, «‹» — к последней.
    const startBase = step > 0 ? -1 : 0;
    const base = started ? current : startBase;
    const next = (base + step + total) % total;
    setIndex(next);
    setStarted(true);
    const node = pendingNodes()[next];
    if (node) {
      focusNode(node);
      return;
    }
    revealAndFocus(next);
  };

  return (
    <span
      aria-label={t('agentSession.pendingCounterAria')}
      className="inline-flex h-6 items-center text-xs font-medium tabular-nums text-gray-700 dark:text-gray-200"
      data-agent-pending-navigator=""
      role="group"
    >
      <button aria-label={t('agentSession.pendingPrev')} className={ARROW_CLASS} type="button" onClick={() => go(-1)}>
        <Icon className="h-3.5 w-3.5" name="chevron-left" />
      </button>
      <span className="min-w-[2.5rem] text-center">
        {current + 1} / {total}
      </span>
      <button aria-label={t('agentSession.pendingNext')} className={ARROW_CLASS} type="button" onClick={() => go(1)}>
        <Icon className="h-3.5 w-3.5" name="chevron-right" />
      </button>
    </span>
  );
}
