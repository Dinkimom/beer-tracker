/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { getTaskCardCursorClass, getTaskCardPaddingClasses } from '../taskCardLayoutHelpers';

import { resolveTaskCardBodyStackClass } from './taskCardBodyLayoutHelpers';
import {
  doesTaskCardTitleLineCountOverflow,
  doesTaskCardTitleTextOverflow,
  isTaskCardTitleOverflowFlagSet,
  resolveSwimlaneDisplayModes,
  resolveTaskCardFittedLineCount,
  resolveTaskCardSwimlaneContentWrapperClass,
  resolveTaskCardTitleMaxLinesFallback,
  resolveTaskCardTitleProbeMaxLines,
  syncTaskCardTitleOverflowFlag,
  TASK_CARD_TITLE_OVERFLOW_DATA_ATTR,
} from './taskCardContentHelpers';

describe('doesTaskCardTitleLineCountOverflow', () => {
  it('treats a box taller than the wrapper minus descender reserve as overflow', () => {
    expect(
      doesTaskCardTitleLineCountOverflow({
        availableHeight: 40,
        descenderReservePx: 2,
        measuredBoxHeight: 39,
        measuredScrollHeight: 40,
      })
    ).toBe(true);
  });

  it('fits when the measured box stays within the reserved height', () => {
    expect(
      doesTaskCardTitleLineCountOverflow({
        availableHeight: 40,
        descenderReservePx: 2,
        measuredBoxHeight: 38,
        measuredScrollHeight: 40,
      })
    ).toBe(false);
  });
});

function mockTitleOverflowBox(input: {
  boxHeight: number;
  clientHeight: number;
  scrollHeight: number;
}): { textEl: HTMLElement; wrapperEl: HTMLElement } {
  const wrapperEl = document.createElement('div');
  const textEl = document.createElement('div');
  textEl.style.display = '-webkit-box';
  Object.defineProperty(wrapperEl, 'clientHeight', { configurable: true, value: input.clientHeight });
  Object.defineProperty(wrapperEl, 'scrollHeight', { configurable: true, value: input.scrollHeight });
  Object.defineProperty(textEl, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: 0,
      height: input.boxHeight,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 0,
      width: 0,
      x: 0,
      y: 0,
    }),
  });
  wrapperEl.appendChild(textEl);
  return { textEl, wrapperEl };
}

describe('doesTaskCardTitleTextOverflow', () => {
  it('detects a title taller than the card after unclamping', () => {
    const box = mockTitleOverflowBox({ boxHeight: 60, clientHeight: 20, scrollHeight: 60 });
    expect(doesTaskCardTitleTextOverflow(box)).toBe(true);
  });

  it('treats a title that fits the card as not overflowing', () => {
    const box = mockTitleOverflowBox({ boxHeight: 18, clientHeight: 40, scrollHeight: 18 });
    expect(doesTaskCardTitleTextOverflow(box)).toBe(false);
  });
});

describe('syncTaskCardTitleOverflowFlag', () => {
  it('writes the overflow flag onto the title element', () => {
    const box = mockTitleOverflowBox({ boxHeight: 18, clientHeight: 40, scrollHeight: 18 });
    syncTaskCardTitleOverflowFlag(box);
    expect(isTaskCardTitleOverflowFlagSet(box.textEl)).toBe(false);
    expect(box.textEl.getAttribute(TASK_CARD_TITLE_OVERFLOW_DATA_ATTR)).toBe('false');
  });
});

describe('resolveTaskCardFittedLineCount', () => {
  it('keeps the highest line count that still fits', () => {
    expect(
      resolveTaskCardFittedLineCount({
        overflowsAt: (lines) => lines > 4,
        probeMaxLines: 8,
      })
    ).toBe(4);
  });

  it('returns one line when even a single line overflows', () => {
    expect(
      resolveTaskCardFittedLineCount({
        overflowsAt: () => true,
        probeMaxLines: 6,
      })
    ).toBe(1);
  });
});

describe('resolveTaskCardTitleProbeMaxLines', () => {
  it('probes one extra line above the height estimate, capped', () => {
    expect(resolveTaskCardTitleProbeMaxLines(50, 12)).toBe(6);
    expect(resolveTaskCardTitleProbeMaxLines(200, 12)).toBe(8);
  });

  it('falls back to the probe cap when line height is unknown', () => {
    expect(resolveTaskCardTitleProbeMaxLines(50, Number.NaN)).toBe(8);
  });
});

describe('resolveTaskCardTitleMaxLinesFallback', () => {
  it('starts one-timeslot cards with more title lines than regular cards', () => {
    expect(resolveTaskCardTitleMaxLinesFallback(false)).toBe(3);
    expect(resolveTaskCardTitleMaxLinesFallback(true)).toBe(5);
  });
});

describe('resolveSwimlaneDisplayModes', () => {
  it('keeps the compact title size on cards shorter than four timeslots', () => {
    expect(resolveSwimlaneDisplayModes(3).textSize).toBe('text-[10px]');
  });

  it('uses the larger title size on cards that are actually four timeslots or wider', () => {
    expect(resolveSwimlaneDisplayModes(4).textSize).toBe('text-xs');
  });
});

describe('getTaskCardPaddingClasses', () => {
  it('uses equal top and bottom padding on compact swimlane cards', () => {
    expect(getTaskCardPaddingClasses(true, true, true)).toContain('py-2');
    expect(getTaskCardPaddingClasses(false, true, true)).toContain('py-2');
  });
});

describe('resolveTaskCardBodyStackClass', () => {
  it('stacks swimlane parent, title and meta with a shared gap', () => {
    expect(resolveTaskCardBodyStackClass('swimlane')).toContain('flex-col');
    expect(resolveTaskCardBodyStackClass('swimlane')).toContain('gap-1');
  });
});

describe('resolveTaskCardSwimlaneContentWrapperClass', () => {
  it('vertically centers the key and title when a parent row is present', () => {
    expect(
      resolveTaskCardSwimlaneContentWrapperClass({ centerTitle: true, isCommentCard: false })
    ).toContain('justify-center');
  });

  it('starts the title from the top when there is no parent row', () => {
    expect(
      resolveTaskCardSwimlaneContentWrapperClass({ centerTitle: false, isCommentCard: false })
    ).toContain('justify-start');
    expect(
      resolveTaskCardSwimlaneContentWrapperClass({ centerTitle: false, isCommentCard: false })
    ).not.toContain('justify-center');
  });

  it('does not force sticky-note comments into a centered column', () => {
    expect(
      resolveTaskCardSwimlaneContentWrapperClass({ centerTitle: true, isCommentCard: true })
    ).not.toContain('justify-center');
  });

  it('keeps sticky-note content full height so reactions do not shift the text', () => {
    expect(
      resolveTaskCardSwimlaneContentWrapperClass({
        centerTitle: true,
        isCommentCard: true,
      })
    ).toContain('h-full');
  });
});

describe('getTaskCardCursorClass', () => {
  it('uses not-allowed when the card is locked and idle', () => {
    expect(getTaskCardCursorClass(false, false, true)).toBe('cursor-not-allowed');
  });

  it('keeps grab and resize cursors over the locked cursor during own gestures', () => {
    expect(getTaskCardCursorClass(true, false, true)).toBe('cursor-grabbing');
    expect(getTaskCardCursorClass(false, true, true)).toBe('cursor-ew-resize');
  });

  it('uses pointer/default cursors in link mode instead of grab', () => {
    expect(getTaskCardCursorClass(false, false, false, { linkMode: 'target', linkingActive: true })).toBe(
      'cursor-pointer'
    );
    expect(getTaskCardCursorClass(false, false, false, { linkMode: 'source', linkingActive: true })).toBe(
      'cursor-default'
    );
    expect(getTaskCardCursorClass(false, false, false, { linkingActive: true })).toBe('cursor-default');
  });
});
