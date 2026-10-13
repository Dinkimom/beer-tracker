import confetti from 'canvas-confetti';

type TicTacToeBurstWinner = 'draw' | 'o' | 'x' | null;

const CONFETTI_COLORS = ['#1d4ed8', '#8eb6ff', '#be123c', '#ff9aaf', '#f6f5f2', '#f5c16c'];

/** Конфети только в момент, когда партия только что стала чьей-то победой. */
export function shouldBurstTicTacToeConfetti(
  previous: TicTacToeBurstWinner,
  next: TicTacToeBurstWinner
): boolean {
  if (previous != null) {
    return false;
  }
  return next === 'x' || next === 'o';
}

/** Залп вверх от верхнего края карточки, чтобы конфетти летело над полем. */
export function burstTicTacToeConfetti(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = rect.top / window.innerHeight;
  void confetti({
    angle: 90,
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
    gravity: 0.9,
    origin: { x, y },
    particleCount: 70,
    scalar: 0.75,
    spread: 58,
    startVelocity: 30,
    ticks: 180,
  });
}
