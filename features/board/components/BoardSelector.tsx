'use client';

import { useState, useRef } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { boardSelectorLabel } from '@/features/board/boardSelectorLabel';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

import { useBoards } from '../hooks/useBoards';

function boardSelectorTriggerTone(isOpen: boolean, hasBoard: boolean): string {
  if (!hasBoard) {
    return '!text-gray-500 dark:!text-gray-400 dark:hover:!text-gray-200';
  }
  if (isOpen) {
    return '!text-gray-900 dark:!text-gray-100';
  }
  return '!text-gray-800 dark:!text-gray-100 dark:hover:!text-white';
}

interface BoardSelectorProps {
  selectedBoardId: number | null;
  onBoardChange: (boardId: number | null) => void;
}

export function BoardSelector({
  selectedBoardId,
  onBoardChange,
}: BoardSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { boards, getBoardById } = useBoards();
  const overlay = useOverlayPresence(isOpen);
  const optionLabels =
    boards.length > 0
      ? boards.map((board) => boardSelectorLabel(board))
      : [t('planning.board.selectTeamPlaceholder')];

  usePopoverDismiss(() => setIsOpen(false), {
    enabled: isOpen,
    escape: { target: 'document' },
    event: 'mousedown',
    refs: [dropdownRef],
  });

  const selectedBoard = getBoardById(selectedBoardId);
  const triggerTone = boardSelectorTriggerTone(isOpen, Boolean(selectedBoard));

  const handleSelect = (boardId: number | null) => {
    onBoardChange(boardId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-grid max-w-[16rem]">
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 flex h-8 w-max max-w-full items-center gap-1.5 overflow-hidden px-2.5 text-base font-semibold"
      >
        <span className="flex min-w-0 flex-col">
          {optionLabels.map((label, index) => (
            <span key={`${label}-${index}`} className="whitespace-nowrap">
              {label}
            </span>
          ))}
        </span>
        <span className="h-4 w-4 shrink-0" />
      </span>
      <Button
        className={`group col-start-1 row-start-1 flex h-8 min-h-0 w-full justify-between gap-1.5 !rounded-md !border-0 !px-2.5 !py-0 text-left !text-base !font-semibold shadow-none ${
          isOpen
            ? '!bg-white hover:!bg-white dark:!bg-gray-700 dark:hover:!bg-gray-700'
            : '!bg-transparent hover:!bg-black/[0.05] dark:hover:!bg-gray-700'
        } ${triggerTone}`}
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="min-w-0 truncate">
          {selectedBoard
            ? boardSelectorLabel(selectedBoard)
            : t('planning.board.selectTeamPlaceholder')}
        </span>

        <Icon
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          name="chevron-down"
        />
      </Button>

      {overlay.mounted ? (
        <div
          className={`absolute top-full left-0 mt-1 flex w-full max-h-80 flex-col gap-0.5 overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${ZIndex.class('dropdownContent')} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          style={{ zIndex: ZIndex.dropdownContent }}
          onAnimationEnd={overlay.onAnimationEnd}
        >
          {boards.map((board) => {
            const isSelected = board.id === selectedBoardId;
            return (
              <Button
                key={board.id}
                className={`!h-8 min-h-0 w-full justify-start !rounded-md !border-0 !px-2.5 !py-0 text-left text-sm shadow-none ${
                  isSelected
                    ? '!bg-blue-50 !text-blue-700 hover:!bg-blue-50 dark:!bg-blue-500/15 dark:!text-blue-300 dark:hover:!bg-blue-500/15'
                    : '!text-gray-800 hover:!bg-black/[0.04] dark:!text-gray-100 dark:hover:!bg-white/10'
                }`}
                type="button"
                variant="ghost"
                onClick={() => handleSelect(board.id)}
              >
                <span className="truncate">{boardSelectorLabel(board)}</span>
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
