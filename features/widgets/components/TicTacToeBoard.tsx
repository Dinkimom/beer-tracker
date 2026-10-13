'use client';

import { useEffect, useRef } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { getTicTacToeCardPaint } from '@/features/task/utils/ticTacToeCardSurface';
import { burstTicTacToeConfetti, shouldBurstTicTacToeConfetti } from '@/features/widgets/burstTicTacToeConfetti';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import {
  applyTicTacToeMove,
  createTicTacToeState,
  parseTicTacToeWidget,
  serializeTicTacToeWidget,
  ticTacToeWinningLine,
  type TicTacToeState,
} from '@/lib/widgets/ticTacToe';

import { TicTacToeGlyph } from './TicTacToeGlyph';

interface TicTacToeBoardProps {
  isDragging?: boolean;
  text: string;
  onChange?: (text: string) => void;
}

function statusMessage(
  state: TicTacToeState,
  t: (key: string, params?: Record<string, string>) => string
): string {
  if (state.winner === 'draw') {
    return t('sprintPlanner.swimlane.ticTacToe.draw');
  }
  return t('sprintPlanner.swimlane.ticTacToe.winner', {
    mark: state.winner === 'o' ? 'O' : 'X',
  });
}

export function TicTacToeBoard({ isDragging = false, onChange, text }: TicTacToeBoardProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const paint = getTicTacToeCardPaint(isDark);
  const state = parseTicTacToeWidget(text) ?? createTicTacToeState();
  const winning = new Set(ticTacToeWinningLine(state) ?? []);
  const finished = state.winner != null;
  const locked = isDragging || onChange == null || finished;
  const rootRef = useRef<HTMLDivElement>(null);
  const winnerRef = useRef(state.winner);

  useEffect(() => {
    const previous = winnerRef.current;
    winnerRef.current = state.winner;
    const root = rootRef.current;
    if (!root || !shouldBurstTicTacToeConfetti(previous, state.winner)) {
      return;
    }
    burstTicTacToeConfetti(root);
  }, [state.winner]);

  const publish = (next: TicTacToeState) => {
    if (!onChange) {
      return;
    }
    const serialized = serializeTicTacToeWidget(next);
    if (serialized !== text) {
      onChange(serialized);
    }
  };

  return (
    <div ref={rootRef} className="absolute inset-0 flex min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-[3px] p-[3px]">
        {state.board.map((mark, index) => {
          const label = mark
            ? t('sprintPlanner.swimlane.ticTacToe.cellFilled', {
                index: String(index + 1),
                mark: mark.toUpperCase(),
              })
            : t('sprintPlanner.swimlane.ticTacToe.cellEmpty', { index: String(index + 1) });
          const won = winning.has(index);
          return (
            <button
              key={index}
              aria-label={label}
              className="flex cursor-pointer items-center justify-center transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:hover:brightness-100 disabled:active:scale-100"
              disabled={locked || mark != null}
              style={{
                backgroundColor: won ? paint.cellWin : paint.cell,
                color: mark === 'o' ? paint.o : paint.x,
              }}
              type="button"
              onClick={() => publish(applyTicTacToeMove(state, index))}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {mark ? <TicTacToeGlyph mark={mark} /> : null}
            </button>
          );
        })}
      </div>
      {finished && onChange && !isDragging ? (
        <div className="flex h-7 shrink-0 items-center justify-between gap-2 px-2 text-xs">
          <span>{statusMessage(state, t)}</span>
          <button
            className="cursor-pointer rounded-sm px-1.5 py-0.5 transition-all duration-200 hover:bg-black/10 active:scale-[0.98] active:bg-black/15 dark:hover:bg-white/10 dark:active:bg-white/15"
            type="button"
            onClick={() => publish(createTicTacToeState())}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {t('sprintPlanner.swimlane.ticTacToe.reset')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
