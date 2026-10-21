'use client';

import { useEffect, useRef } from 'react';

import { Icon } from '@/components/Icon';
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

/** Насколько зачёркивание выходит за центры крайних клеток (в долях клетки). */
const STRIKE_OVERSHOOT = 0.3;

/** После партии поле съёживается к верху, освобождая низ под плашку итога. */
const FINISHED_BOARD_SCALE = 0.78;

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

/** Отрезок через выигрышную тройку в координатах поля 3×3. */
function strikeSegment(line: readonly number[]) {
  const center = (index: number) => ({ x: (index % 3) + 0.5, y: Math.floor(index / 3) + 0.5 });
  const from = center(line[0]);
  const to = center(line[2]);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const dx = ((to.x - from.x) / length) * STRIKE_OVERSHOOT;
  const dy = ((to.y - from.y) / length) * STRIKE_OVERSHOOT;
  return { x1: from.x - dx, y1: from.y - dy, x2: to.x + dx, y2: to.y + dy };
}

export function TicTacToeBoard({ isDragging = false, onChange, text }: TicTacToeBoardProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const paint = getTicTacToeCardPaint(isDark);
  const state = parseTicTacToeWidget(text) ?? createTicTacToeState();
  const winningLine = ticTacToeWinningLine(state);
  const winning = new Set(winningLine ?? []);
  const finished = state.winner != null;
  const locked = isDragging || onChange == null || finished;
  const markColor = (mark: 'o' | 'x') => (mark === 'o' ? paint.o : paint.x);
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

  const markOpacity = (dimmed: boolean) => {
    if (!dimmed) {
      return 1;
    }
    return state.winner === 'draw' ? 0.55 : 0.3;
  };
  const strike = winningLine ? strikeSegment(winningLine) : null;
  const winnerMark = state.winner === 'x' || state.winner === 'o' ? state.winner : null;

  return (
    <div ref={rootRef} className="absolute inset-0">
      <div
        className="absolute inset-[8%] origin-top transition-transform duration-300 ease-out"
        style={finished && onChange && !isDragging ? { transform: `scale(${FINISHED_BOARD_SCALE})` } : undefined}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 3 3"
        >
          <g stroke={paint.grid} strokeLinecap="round" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
            <line vectorEffect="non-scaling-stroke" x1={1} x2={1} y1={0.04} y2={2.96} />
            <line vectorEffect="non-scaling-stroke" x1={2} x2={2} y1={0.04} y2={2.96} />
            <line vectorEffect="non-scaling-stroke" x1={0.04} x2={2.96} y1={1} y2={1} />
            <line vectorEffect="non-scaling-stroke" x1={0.04} x2={2.96} y1={2} y2={2} />
          </g>
        </svg>
        <div className="grid h-full w-full grid-cols-3 grid-rows-3">
          {state.board.map((mark, index) => {
            const label = mark
              ? t('sprintPlanner.swimlane.ticTacToe.cellFilled', {
                  index: String(index + 1),
                  mark: mark.toUpperCase(),
                })
              : t('sprintPlanner.swimlane.ticTacToe.cellEmpty', { index: String(index + 1) });
            const dimmed = finished && !winning.has(index);
            const playable = !locked && mark == null;
            return (
              <button
                key={index}
                aria-label={label}
                className="group/cell flex cursor-pointer items-center justify-center rounded-md transition-all duration-200 hover:bg-black/[0.04] active:scale-[0.98] active:bg-black/[0.07] disabled:pointer-events-none dark:hover:bg-white/[0.05] dark:active:bg-white/[0.08]"
                disabled={!playable}
                type="button"
                onClick={() => publish(applyTicTacToeMove(state, index))}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {mark ? (
                  <span
                    className="flex h-full w-full items-center justify-center transition-opacity duration-200"
                    style={{ color: markColor(mark), opacity: markOpacity(dimmed) }}
                  >
                    <TicTacToeGlyph mark={mark} />
                  </span>
                ) : null}
                {playable ? (
                  <span
                    className="flex h-full w-full items-center justify-center opacity-0 transition-opacity duration-200 group-hover/cell:opacity-25"
                    style={{ color: markColor(state.turn) }}
                  >
                    <TicTacToeGlyph mark={state.turn} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {strike && winnerMark ? (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 3 3"
          >
            <line
              stroke={markColor(winnerMark)}
              strokeLinecap="round"
              strokeOpacity={0.85}
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
              {...strike}
            />
          </svg>
        ) : null}
      </div>
      {finished && onChange && !isDragging ? (
        <div
          className="absolute bottom-[5%] left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border py-0.5 pl-2.5 pr-0.5 text-[11px] font-semibold shadow-sm"
          style={{ backgroundColor: paint.surface, borderColor: paint.grid }}
        >
          <span style={{ color: winnerMark ? markColor(winnerMark) : paint.text }}>
            {statusMessage(state, t)}
          </span>
          <button
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 font-medium transition-all duration-200 hover:bg-black/[0.06] active:scale-[0.98] active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15"
            type="button"
            onClick={() => publish(createTicTacToeState())}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon className="h-3 w-3" name="refresh" />
            {t('sprintPlanner.swimlane.ticTacToe.reset')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
