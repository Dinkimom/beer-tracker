import type { TaskBarSquashSpringState } from './useTaskBarResizeSquash';

import { describe, expect, it } from 'vitest';

import {
  resolveTaskBarResizeSquashDeflection,
  resolveTaskBarSquashKick,
  stepTaskBarSquashSpring,
} from './useTaskBarResizeSquash';

function simulate(
  initial: TaskBarSquashSpringState,
  target: number,
  released: boolean,
  seconds: number
): number[] {
  const trace: number[] = [];
  let state = initial;
  for (let t = 0; t < seconds; t += 1 / 60) {
    state = stepTaskBarSquashSpring(state, target, 1 / 60, released);
    trace.push(state.deflection);
  }
  return trace;
}

describe('resolveTaskBarResizeSquashDeflection', () => {
  it('keeps the card at rest until the length changes', () => {
    expect(resolveTaskBarResizeSquashDeflection(4, 4)).toBeCloseTo(0, 10);
  });

  it('flattens the card more the further it is stretched', () => {
    const slight = resolveTaskBarResizeSquashDeflection(4, 5);
    const double = resolveTaskBarResizeSquashDeflection(4, 8);
    expect(slight).toBeLessThan(0);
    expect(double).toBeLessThan(slight);
  });

  it('reacts to shrinking much softer than to stretching by the same ratio', () => {
    const stretch = -resolveTaskBarResizeSquashDeflection(4, 8);
    const shrink = resolveTaskBarResizeSquashDeflection(8, 4);
    expect(shrink).toBeGreaterThan(0);
    expect(shrink).toBeLessThan(stretch / 2);
  });

  it('saturates instead of growing without bound', () => {
    expect(resolveTaskBarResizeSquashDeflection(1, 60)).toBeGreaterThan(-0.16);
    expect(resolveTaskBarResizeSquashDeflection(60, 1)).toBeLessThan(0.07);
  });
});

describe('resolveTaskBarSquashKick', () => {
  it('pushes in the direction of the step', () => {
    expect(resolveTaskBarSquashKick(-0.05, 60)).toBeLessThan(0);
    expect(resolveTaskBarSquashKick(0.02, 60)).toBeGreaterThan(0);
  });

  it('pushes harder for fast consecutive steps, up to a cap', () => {
    const slow = Math.abs(resolveTaskBarSquashKick(-0.05, 200));
    const fast = Math.abs(resolveTaskBarSquashKick(-0.05, 30));
    expect(fast).toBeGreaterThan(slow);
    expect(resolveTaskBarSquashKick(-0.05, 0)).toBeCloseTo(resolveTaskBarSquashKick(-0.05, 24), 6);
  });
});

describe('stepTaskBarSquashSpring', () => {
  it('follows the target during the gesture without a visible wobble', () => {
    const trace = simulate({ deflection: 0, velocity: 0 }, -0.1, false, 0.6);
    expect(trace.at(-1)).toBeCloseTo(-0.1, 2);
    expect(Math.min(...trace)).toBeGreaterThan(-0.11);
  });

  it('overshoots past rest after release like a rubber band and settles', () => {
    const trace = simulate({ deflection: -0.12, velocity: 0 }, 0, true, 1.5);
    expect(Math.max(...trace)).toBeGreaterThan(0.01);
    expect(Math.max(...trace)).toBeLessThan(0.12);
    expect(Math.abs(trace.at(-1) ?? 1)).toBeLessThan(0.001);
  });

  it('clamps the deflection on extreme kicks', () => {
    const trace = simulate({ deflection: 0, velocity: -50 }, 0, false, 0.2);
    expect(Math.min(...trace)).toBeGreaterThanOrEqual(-0.3);
  });
});
