/** @vitest-environment jsdom */

import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IconActionMotion } from './IconActionMotion';

function motionClass(container: HTMLElement) {
  return container.querySelector('[data-icon-motion]')?.classList.contains('icon-action-motion');
}

describe('IconActionMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays when a click turns the control on', () => {
    const { container, rerender } = render(
      <button type="button">
        <IconActionMotion active={false} name="cursor">
          <svg />
        </IconActionMotion>
      </button>
    );
    const button = container.querySelector('button') as HTMLButtonElement;

    fireEvent.mouseEnter(button);
    expect(motionClass(container)).toBe(false);

    rerender(
      <button type="button">
        <IconActionMotion active name="cursor">
          <svg />
        </IconActionMotion>
      </button>
    );
    expect(motionClass(container)).toBe(false);

    rerender(
      <button type="button">
        <IconActionMotion active={false} name="cursor">
          <svg />
        </IconActionMotion>
      </button>
    );
    fireEvent.click(button);
    rerender(
      <button type="button">
        <IconActionMotion active name="cursor">
          <svg />
        </IconActionMotion>
      </button>
    );
    expect(motionClass(container)).toBe(true);
  });

  it('stays still when a click turns the control off', () => {
    const { container, rerender } = render(
      <button type="button">
        <IconActionMotion active name="cursor">
          <svg />
        </IconActionMotion>
      </button>
    );
    const button = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(button);
    rerender(
      <button type="button">
        <IconActionMotion active={false} name="cursor">
          <svg />
        </IconActionMotion>
      </button>
    );
    expect(motionClass(container)).toBe(false);
  });

  it('plays on every click when the icon is an action', () => {
    const { container } = render(
      <button type="button">
        <IconActionMotion name="play-fill">
          <svg />
        </IconActionMotion>
      </button>
    );
    const button = container.querySelector('button') as HTMLButtonElement;
    fireEvent.mouseEnter(button);
    expect(motionClass(container)).toBe(false);
    fireEvent.click(button);
    expect(motionClass(container)).toBe(true);
  });

  it('does not play when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container } = render(
      <button type="button">
        <IconActionMotion name="play-fill">
          <svg />
        </IconActionMotion>
      </button>
    );
    fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(motionClass(container)).toBe(false);
  });
});
