import type { ParsedCalendarEvent } from './calendarEventTypes';

import {
  applyVEventProperty,
  createEmptyVEvent,
  flushVEvent,
  unfoldIcsLines,
} from './parseIcsCalendarDataHelpers';

interface ParseState {
  current: ReturnType<typeof createEmptyVEvent>;
  events: ParsedCalendarEvent[];
  inEvent: boolean;
}

function handleIcsLine(state: ParseState, line: string): void {
  if (line === 'BEGIN:VEVENT') {
    state.inEvent = true;
    state.current = createEmptyVEvent();
    return;
  }
  if (line === 'END:VEVENT') {
    if (state.inEvent) {
      const flushed = flushVEvent(state.current);
      if (flushed) state.events.push(flushed);
    }
    state.inEvent = false;
    return;
  }
  if (!state.inEvent) return;

  const sep = line.indexOf(':');
  if (sep <= 0) return;
  const head = line.slice(0, sep);
  const value = line.slice(sep + 1);
  const [name, ...paramParts] = head.split(';');
  applyVEventProperty(state.current, name ?? '', value, paramParts.join(';'));
}

export function parseIcsCalendarData(icsText: string): ParsedCalendarEvent[] {
  const state: ParseState = {
    current: createEmptyVEvent(),
    events: [],
    inEvent: false,
  };
  for (const line of unfoldIcsLines(icsText)) {
    handleIcsLine(state, line);
  }
  return state.events;
}
