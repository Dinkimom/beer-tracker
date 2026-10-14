import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appChangelogNotes,
  formatAppChangelogDate,
  parseAppChangelog,
  parseEmbeddedAppChangelog,
  selectAppChangelogReleases,
} from '@/lib/changelog/appChangelog';

const SAMPLE = `# Changelog

## [1.2.0] — 2026-10-14

### English

- Second feature
- Docker Hub images tag 1.2.0

### Русский

- Вторая возможность
- Образы Docker Hub tag 1.2.0

## [1.1.0] - 2026-10-01

### English

- First feature

### Русский

- Первая возможность

## [1.0.0] — 2026-09-01

### English

Plain paragraph without a bullet.

### Русский

Обычный абзац.
`;

describe('parseAppChangelog', () => {
  it('reads version, date, and bullets in both languages', () => {
    const releases = parseAppChangelog(SAMPLE);
    expect(releases.map((release) => release.version)).toEqual(['1.2.0', '1.1.0', '1.0.0']);
    expect(releases[0]).toMatchObject({
      date: '2026-10-14',
      notes: {
        en: ['Second feature', 'Docker Hub images tag 1.2.0'],
        ru: ['Вторая возможность', 'Образы Docker Hub tag 1.2.0'],
      },
    });
    expect(releases[2].notes.en).toEqual([]);
  });
});

describe('selectAppChangelogReleases', () => {
  const releases = parseAppChangelog(SAMPLE);

  it('hides newer releases and Docker Hub lines', () => {
    const selected = selectAppChangelogReleases(releases, '1.1.0');
    expect(selected.map((release) => release.version)).toEqual(['1.1.0']);
    expect(selected[0].notes.en).toEqual(['First feature']);
  });

  it('keeps every release when the running version is not semver', () => {
    const selected = selectAppChangelogReleases(releases, 'dev');
    expect(selected.map((release) => release.version)).toEqual(['1.2.0', '1.1.0']);
    expect(selected[0].notes.ru).toEqual(['Вторая возможность']);
  });

  it('caps releases and notes', () => {
    const many = parseAppChangelog(
      [
        '## [1.0.3] — 2026-01-03',
        '### English',
        '- a',
        '- b',
        '- c',
        '### Русский',
        '- а',
        '## [1.0.2] — 2026-01-02',
        '### English',
        '- only',
        '### Русский',
        '- только',
        '## [1.0.1] — 2026-01-01',
        '### English',
        '- older',
        '### Русский',
        '- старше',
      ].join('\n')
    );
    const selected = selectAppChangelogReleases(many, '1.0.3', { notes: 2, releases: 2 });
    expect(selected).toHaveLength(2);
    expect(selected[0].notes.en).toEqual(['a', 'b']);
  });

  it('drops a release that is only an image publish line', () => {
    const parsed = parseAppChangelog(
      '## [1.0.1] — 2026-01-01\n### English\n- Docker Hub images tag\n### Русский\n- Образы Docker Hub tag\n'
    );
    expect(selectAppChangelogReleases(parsed, '1.0.1')).toEqual([]);
  });

  it('reads the repository changelog', () => {
    const markdown = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8');
    const selected = selectAppChangelogReleases(parseAppChangelog(markdown), '1.13.0');
    expect(selected.map((release) => release.version)).toEqual([
      '1.13.0',
      '1.12.0',
      '1.11.1',
      '1.11.0',
      '1.10.0',
    ]);
    expect(selected[0].notes.en.some((note) => note.startsWith('Docker Hub'))).toBe(false);
    expect(selected[0].notes.ru[0]).toContain('крестиков-ноликов');
  });
});

describe('appChangelogNotes', () => {
  it('falls back to the other language when the selected one is empty', () => {
    const release = {
      date: '2026-01-01',
      notes: { en: [], ru: ['Только русский'] },
      version: '1.0.0',
    };
    expect(appChangelogNotes(release, 'en')).toEqual(['Только русский']);
  });
});

describe('formatAppChangelogDate', () => {
  it('formats a calendar date in the UI language', () => {
    expect(formatAppChangelogDate('2026-10-14', 'en')).toContain('2026');
    expect(formatAppChangelogDate('2026-10-14', 'en')).toContain('14');
    expect(formatAppChangelogDate('2026-10-14', 'ru')).toContain('2026');
    expect(formatAppChangelogDate('not-a-date', 'en')).toBe('not-a-date');
  });
});

describe('parseEmbeddedAppChangelog', () => {
  it('rejects malformed payloads', () => {
    expect(parseEmbeddedAppChangelog(undefined)).toEqual([]);
    expect(parseEmbeddedAppChangelog('{')).toEqual([]);
    expect(parseEmbeddedAppChangelog('{"version":"1"}')).toEqual([]);
  });
});
