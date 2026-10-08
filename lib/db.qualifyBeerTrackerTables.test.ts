import { afterEach, describe, expect, it } from 'vitest';

import { qualifyBeerTrackerTables } from '@/lib/db';

describe('qualifyBeerTrackerTables', () => {
  const previousSchema = process.env.BEER_TRACKER_SCHEMA;

  afterEach(() => {
    if (previousSchema === undefined) {
      delete process.env.BEER_TRACKER_SCHEMA;
    } else {
      process.env.BEER_TRACKER_SCHEMA = previousSchema;
    }
  });

  it('prefixes from, JOIN and DELETE USING (default schema public)', () => {
    delete process.env.BEER_TRACKER_SCHEMA;
    const sql = qualifyBeerTrackerTables(
      `DELETE FROM team_members tm
       USING teams t
       WHERE tm.team_id = t.id`
    );
    expect(sql).toMatch(/DELETE FROM public\.team_members tm/i);
    expect(sql).toMatch(/USING public\.teams t/i);
  });

  it('prefixes UPDATE ... FROM with BEER_TRACKER_SCHEMA override', () => {
    process.env.BEER_TRACKER_SCHEMA = 'beer_tracker';
    const sql = qualifyBeerTrackerTables(
      `UPDATE team_members tm
       SET role_slug = $4
       FROM teams t
       WHERE tm.team_id = t.id`
    );
    expect(sql).toMatch(/UPDATE beer_tracker\.team_members tm/i);
    expect(sql).toMatch(/FROM beer_tracker\.teams t/i);
  });
});
