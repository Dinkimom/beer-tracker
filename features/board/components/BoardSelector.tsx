'use client';

import { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { boardSelectorLabel } from '@/features/board/boardSelectorLabel';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

import { useBoards } from '../hooks/useBoards';

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
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { boards, getBoardById } = useBoards();
  const overlay = useOverlayPresence(isOpen);

  // Устанавливаем ширину dropdown равной ширине кнопки
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonWidth = buttonRef.current.getBoundingClientRect().width;
      setDropdownWidth(buttonWidth);
    }
  }, [isOpen]);

  // Закрываем dropdown при клике вне его или нажатии Escape
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const selectedBoard = getBoardById(selectedBoardId);

  const handleSelect = (boardId: number | null) => {
    onBoardChange(boardId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        ref={buttonRef}
        className={`flex h-11 min-h-0 min-w-[240px] justify-between gap-2.5 px-4 py-0 text-left text-base ${
          isOpen ? 'border-gray-400 dark:border-gray-500' : ''
        }`}
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="min-w-0 flex-1 overflow-hidden text-left">
          {selectedBoard ? (
            <span className="truncate text-base font-medium text-gray-900 dark:text-gray-100">
              {boardSelectorLabel(selectedBoard)}
            </span>
          ) : (
            <span className="truncate text-base font-medium text-gray-500 dark:text-gray-400">
              {t('planning.board.selectTeamPlaceholder')}
            </span>
          )}
        </div>

        <Icon
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
            isOpen ? 'rotate-180' : ''
          }`}
          name="chevron-down"
        />
      </Button>

      {overlay.mounted ? (
        <div
          className={`absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${ZIndex.class('dropdownContent')} max-h-96 overflow-auto min-w-[220px] ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          style={{
            width: dropdownWidth ? `${Math.max(dropdownWidth, 220)}px` : '220px',
            zIndex: ZIndex.dropdownContent,
          }}
          onAnimationEnd={overlay.onAnimationEnd}
        >
          <div className="py-1">
            {boards.map((board) => {
              const isSelected = board.id === selectedBoardId;
              return (
                <Button
                  key={board.id}
                  className={`h-auto min-h-0 w-full justify-start rounded-none border-0 border-b border-gray-100 px-4 py-2.5 text-left text-base shadow-none last:border-b-0 dark:border-gray-700 ${
                    isSelected
                      ? 'bg-blue-50 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-900/30'
                      : ''
                  }`}
                  type="button"
                  variant="ghost"
                  onClick={() => handleSelect(board.id)}
                >
                  <span
                    className={`text-base ${
                      isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {boardSelectorLabel(board)}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
