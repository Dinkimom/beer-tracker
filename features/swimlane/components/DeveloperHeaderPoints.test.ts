import { describe, expect, it } from 'vitest';

import {
  formatDeveloperHeaderPointsContent,
  resolveDeveloperHeaderPointsVisibility,
} from './DeveloperHeaderPoints';

describe('resolveDeveloperHeaderPointsVisibility', () => {
  it('shows only SP for a developer row', () => {
    expect(resolveDeveloperHeaderPointsVisibility('developer', 5, 3)).toEqual({
      hasPoints: true,
      showSP: true,
      showTP: false,
    });
  });

  it('shows only TP for a tester row', () => {
    expect(resolveDeveloperHeaderPointsVisibility('tester', 5, 3)).toEqual({
      hasPoints: true,
      showSP: false,
      showTP: true,
    });
  });

  it('shows SP and TP together on a feature row', () => {
    expect(resolveDeveloperHeaderPointsVisibility('other', 5, 3, true)).toEqual({
      hasPoints: true,
      showSP: true,
      showTP: true,
    });
  });

  it('shows both kinds on a feature row even when one total is 0', () => {
    expect(resolveDeveloperHeaderPointsVisibility('other', 0, 3, true, true)).toEqual({
      hasPoints: true,
      showSP: true,
      showTP: true,
    });
  });

  it('shows zeros when the row has tasks but no volume', () => {
    expect(resolveDeveloperHeaderPointsVisibility('other', 0, 0, true, true)).toEqual({
      hasPoints: true,
      showSP: true,
      showTP: true,
    });
  });

  it('keeps the empty-row label when there are no tasks', () => {
    expect(resolveDeveloperHeaderPointsVisibility('other', 0, 0, true, false)).toEqual({
      hasPoints: false,
      showSP: false,
      showTP: false,
    });
  });
});

describe('formatDeveloperHeaderPointsContent', () => {
  it('adds units when both kinds are visible', () => {
    expect(
      formatDeveloperHeaderPointsContent(true, 2, 5, 40, 1, 3, 33, true)
    ).toEqual({
      spContent: '2/5sp (40%)',
      tpContent: '1/3tp (33%)',
    });
  });

  it('formats a missing estimate as ?sp / ?tp', () => {
    expect(formatDeveloperHeaderPointsContent(true, 0, 0, 0, 0, 0, 0, false)).toEqual({
      spContent: '?sp',
      tpContent: '?tp',
    });
  });

  it('rounds fractional totals to hundredths', () => {
    expect(
      formatDeveloperHeaderPointsContent(true, 1.234, 2.345, 53, 0.00000000000001, 1.5, 0, true)
    ).toEqual({
      spContent: '1.23/2.35sp (53%)',
      tpContent: '0/1.5tp (0%)',
    });
  });
});
