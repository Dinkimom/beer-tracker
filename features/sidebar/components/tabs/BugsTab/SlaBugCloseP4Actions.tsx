'use client';

import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useSlaBugCloseP4Action } from '@/features/sla-bugs/hooks/useSlaBugCloseP4Action';
import {
  resolveCloseP4DecisionState,
  SLA_BUG_CLOSE_P4_TAG_KEEP,
  SLA_BUG_CLOSE_P4_TAG_SEND,
  type CloseP4DecisionState,
  type SlaBugCloseP4Action,
} from '@/lib/slaBugs/closeP4Actions';

function stopDragActivation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

interface SlaBugCloseP4ActionsProps {
  boardId: number | null | undefined;
  issueKey: string;
  trackerTags?: string[];
}

function decisionFromTag(tag: string): CloseP4DecisionState | null {
  if (tag === SLA_BUG_CLOSE_P4_TAG_SEND) {
    return 'on_approval';
  }
  if (tag === SLA_BUG_CLOSE_P4_TAG_KEEP) {
    return 'kept';
  }
  return null;
}

export function SlaBugCloseP4Actions({
  boardId,
  issueKey,
  trackerTags,
}: SlaBugCloseP4ActionsProps) {
  const { t } = useI18n();
  const mutation = useSlaBugCloseP4Action(boardId);
  const [pendingAction, setPendingAction] = useState<SlaBugCloseP4Action | null>(null);
  const [localDecision, setLocalDecision] = useState<CloseP4DecisionState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const decision = localDecision ?? resolveCloseP4DecisionState(trackerTags);

  const runAction = (action: SlaBugCloseP4Action) => {
    setErrorMessage(null);
    setPendingAction(action);
    mutation.mutate(
      { issueKey, action },
      {
        onSuccess: (data) => {
          const nextDecision = decisionFromTag(data.tag);
          if (nextDecision) {
            setLocalDecision(nextDecision);
          }
        },
        onError: () => {
          setErrorMessage(t('sidebar.bugsTab.closeP4.error'));
        },
        onSettled: () => {
          setPendingAction(null);
        },
      }
    );
  };

  const isBusy = mutation.isPending;

  if (decision === 'on_approval') {
    return (
      <p className="pointer-events-auto mt-2 text-[11px] font-semibold leading-snug text-blue-700 dark:text-blue-300">
        {t('sidebar.bugsTab.closeP4.onApproval')}
      </p>
    );
  }

  if (decision === 'kept') {
    return (
      <p className="pointer-events-auto mt-2 text-[11px] font-semibold leading-snug text-gray-700 dark:text-gray-300">
        {t('sidebar.bugsTab.closeP4.kept')}
      </p>
    );
  }

  return (
    <div
      className="pointer-events-auto"
      onMouseDown={stopDragActivation}
      onPointerDown={stopDragActivation}
      onTouchStart={stopDragActivation}
    >
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          className="cursor-pointer rounded-md bg-blue-600 px-2 py-2 text-[11px] font-semibold leading-tight text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
          disabled={isBusy}
          type="button"
          onClick={() => runAction('send_for_approval')}
        >
          {pendingAction === 'send_for_approval'
            ? t('sidebar.bugsTab.closeP4.sending')
            : t('sidebar.bugsTab.closeP4.sendForApproval')}
        </button>
        <button
          className="cursor-pointer rounded-md border border-gray-300 bg-white/80 px-2 py-2 text-[11px] font-semibold leading-tight text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-500 dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-700/80"
          disabled={isBusy}
          type="button"
          onClick={() => runAction('keep')}
        >
          {pendingAction === 'keep'
            ? t('sidebar.bugsTab.closeP4.saving')
            : t('sidebar.bugsTab.closeP4.keep')}
        </button>
      </div>
      {errorMessage ? (
        <p className="mt-1.5 text-[10px] leading-snug text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
