import type { SlaPriority } from './types';

const SEVERITY_TO_PRIORITY: Record<string, SlaPriority> = {
  S1: 'P0',
  S2: 'P2',
  S3: 'P3',
  S4: 'P4',
};

function parseDirectPriority(upper: string): SlaPriority | null {
  if (upper === 'P0' || upper === 'P1' || upper === 'P2' || upper === 'P3' || upper === 'P4') {
    return upper as SlaPriority;
  }
  return null;
}

function parseSeverityAlias(upper: string): SlaPriority | null {
  return SEVERITY_TO_PRIORITY[upper] ?? null;
}

function parsePriorityFromPattern(upper: string, pattern: RegExp, map?: Record<string, SlaPriority>): SlaPriority | null {
  const match = upper.match(pattern);
  if (!match) {
    return null;
  }
  if (map) {
    return map[match[1]] ?? null;
  }
  return `P${match[1]}` as SlaPriority;
}

export function parseSlaPriorityFromSeverity(incidentSeverity: string | undefined): SlaPriority | null {
  const s = (incidentSeverity ?? '').trim();
  if (!s) {
    return null;
  }
  const upper = s.toUpperCase();
  return (
    parseDirectPriority(upper) ??
    parseSeverityAlias(upper) ??
    parsePriorityFromPattern(upper, /\bP([0-4])\b/) ??
    parsePriorityFromPattern(upper, /\bS([1-4])\b/, { '1': 'P0', '2': 'P2', '3': 'P3', '4': 'P4' })
  );
}
