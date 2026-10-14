/**
 * Релиз-ноты из CHANGELOG.md для экрана «Что нового».
 * Строки про образы Docker Hub остаются в файле и в список не попадают.
 */

interface AppChangelogRelease {
  date: string;
  notes: {
    en: string[];
    ru: string[];
  };
  version: string;
}

type AppChangelogLanguage = 'en' | 'ru';

const RELEASE_HEADING = /^## \[([^\]]+)\]\s+[—–-]\s+(\d{4}-\d{2}-\d{2})$/;
const SEMVER_PARTS = /^(\d+)\.(\d+)\.(\d+)$/;
const OPS_NOTE_PREFIXES = ['Docker Hub images', 'Образы Docker Hub'] as const;
const DEFAULT_RELEASE_LIMIT = 5;
const DEFAULT_NOTE_LIMIT = 7;
const DATE_LOCALE: Record<AppChangelogLanguage, string> = { en: 'en-GB', ru: 'ru-RU' };

interface ChangelogDraft {
  date: string;
  lang: AppChangelogLanguage | null;
  notes: AppChangelogRelease['notes'];
  version: string;
}

interface ChangelogLimits {
  notes?: number;
  releases?: number;
}

function compareSemver(left: string, right: string): number | null {
  const a = SEMVER_PARTS.exec(left.trim());
  const b = SEMVER_PARTS.exec(right.trim());
  if (!a || !b) {
    return null;
  }
  const aParts = [Number(a[1]), Number(a[2]), Number(a[3])];
  const bParts = [Number(b[1]), Number(b[2]), Number(b[3])];
  for (let index = 0; index < aParts.length; index += 1) {
    const diff = aParts[index] - bParts[index];
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function releaseHeading(line: string): { date: string; version: string } | null {
  const match = RELEASE_HEADING.exec(line);
  if (!match) {
    return null;
  }
  return { version: match[1].trim(), date: match[2] };
}

function sectionLanguage(line: string): AppChangelogLanguage | null {
  if (line === '### English') {
    return 'en';
  }
  if (line === '### Русский') {
    return 'ru';
  }
  return null;
}

function appendChangelogLine(draft: ChangelogDraft | null, line: string): void {
  if (!draft) {
    return;
  }
  const language = sectionLanguage(line);
  if (language) {
    draft.lang = language;
    return;
  }
  if (!draft.lang || !line.startsWith('- ')) {
    return;
  }
  const note = line.slice(2).trim();
  if (note) {
    draft.notes[draft.lang].push(note);
  }
}

function toRelease(draft: ChangelogDraft): AppChangelogRelease {
  return {
    date: draft.date,
    notes: { en: draft.notes.en, ru: draft.notes.ru },
    version: draft.version,
  };
}

export function parseAppChangelog(markdown: string): AppChangelogRelease[] {
  const releases: AppChangelogRelease[] = [];
  let draft: ChangelogDraft | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = releaseHeading(line);
    if (heading) {
      if (draft) {
        releases.push(toRelease(draft));
      }
      draft = { ...heading, lang: null, notes: { en: [], ru: [] } };
      continue;
    }
    appendChangelogLine(draft, line);
  }

  if (draft) {
    releases.push(toRelease(draft));
  }
  return releases;
}

function isProductNote(note: string): boolean {
  return !OPS_NOTE_PREFIXES.some((prefix) => note.startsWith(prefix));
}

function trimProductNotes(notes: readonly string[], limit: number): string[] {
  const productNotes: string[] = [];
  for (const note of notes) {
    if (!isProductNote(note)) {
      continue;
    }
    productNotes.push(note);
    if (productNotes.length >= limit) {
      break;
    }
  }
  return productNotes;
}

function releaseVisibleForApp(release: AppChangelogRelease, appVersion: string): boolean {
  if (compareSemver(appVersion, '0.0.0') === null) {
    return true;
  }
  const order = compareSemver(release.version, appVersion);
  return order !== null && order <= 0;
}

export function selectAppChangelogReleases(
  releases: readonly AppChangelogRelease[],
  appVersion: string,
  limits: ChangelogLimits = {}
): AppChangelogRelease[] {
  const releaseLimit = limits.releases ?? DEFAULT_RELEASE_LIMIT;
  const noteLimit = limits.notes ?? DEFAULT_NOTE_LIMIT;
  const selected: AppChangelogRelease[] = [];

  for (const release of releases) {
    if (!releaseVisibleForApp(release, appVersion)) {
      continue;
    }
    const notes = {
      en: trimProductNotes(release.notes.en, noteLimit),
      ru: trimProductNotes(release.notes.ru, noteLimit),
    };
    if (notes.en.length === 0 && notes.ru.length === 0) {
      continue;
    }
    selected.push({ date: release.date, notes, version: release.version });
    if (selected.length >= releaseLimit) {
      break;
    }
  }

  return selected;
}

export function appChangelogNotes(
  release: AppChangelogRelease,
  language: AppChangelogLanguage
): readonly string[] {
  const notes = release.notes[language];
  if (notes.length > 0) {
    return notes;
  }
  return language === 'en' ? release.notes.ru : release.notes.en;
}

export function formatAppChangelogDate(isoDate: string, language: AppChangelogLanguage): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(DATE_LOCALE[language], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isChangelogNotes(value: unknown): value is AppChangelogRelease['notes'] {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const notes = value as Record<string, unknown>;
  return isStringList(notes.en) && isStringList(notes.ru);
}

function isAppChangelogRelease(value: unknown): value is AppChangelogRelease {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const row = value as Record<string, unknown>;
  return typeof row.version === 'string' && typeof row.date === 'string' && isChangelogNotes(row.notes);
}

export function parseEmbeddedAppChangelog(raw: string | undefined): AppChangelogRelease[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isAppChangelogRelease)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export function readEmbeddedAppChangelog(): AppChangelogRelease[] {
  return parseEmbeddedAppChangelog(process.env.NEXT_PUBLIC_APP_CHANGELOG);
}
