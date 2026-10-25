import { describe, expect, it } from 'vitest';

import { isMigrationFileName, planMigrations, toMigrationFile } from './migrationPlan';

const baseline = toMigrationFile('0001_baseline.sql', 'CREATE TABLE a ();');
const second = toMigrationFile('0002_add_b.sql', 'CREATE TABLE b ();');

describe('isMigrationFileName', () => {
  it('accepts numbered snake_case sql files only', () => {
    expect(isMigrationFileName('0001_baseline.sql')).toBe(true);
    expect(isMigrationFileName('0012_add_comment_tags.sql')).toBe(true);
    expect(isMigrationFileName('init.sql')).toBe(false);
    expect(isMigrationFileName('1_baseline.sql')).toBe(false);
    expect(isMigrationFileName('0003-add-x.sql')).toBe(false);
    expect(isMigrationFileName('0003_add_x.sql.bak')).toBe(false);
  });
});

describe('planMigrations', () => {
  it('runs everything in name order on an empty database', () => {
    const plan = planMigrations([second, baseline], []);
    expect(plan.pending.map((file) => file.name)).toEqual(['0001_baseline', '0002_add_b']);
    expect(plan.changed).toEqual([]);
    expect(plan.unknown).toEqual([]);
  });

  it('skips applied files and reports edited ones without re-running them', () => {
    const plan = planMigrations([baseline, second], [{ checksum: 'other', name: '0001_baseline' }]);
    expect(plan.pending.map((file) => file.name)).toEqual(['0002_add_b']);
    expect(plan.changed).toEqual(['0001_baseline']);
  });

  it('reports migrations the database has but the code does not', () => {
    const plan = planMigrations(
      [baseline],
      [
        { checksum: baseline.checksum, name: '0001_baseline' },
        { checksum: 'x', name: '0002_add_b' },
      ]
    );
    expect(plan.pending).toEqual([]);
    expect(plan.unknown).toEqual(['0002_add_b']);
  });
});
