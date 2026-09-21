import { describe, expect, it } from 'vitest';

import { qualifyBeerTrackerTables } from '@/lib/db';

describe('qualifyBeerTrackerTables', () => {
  it('prefixes FROM, JOIN and DELETE USING', () => {
    const sql = qualifyBeerTrackerTables(
      `DELETE FROM team_members tm
       USING teams t
       WHERE tm.team_id = t.id`
    );
    expect(sql).toMatch(/DELETE FROM beer_tracker\.team_members tm/i);
    expect(sql).toMatch(/USING beer_tracker\.teams t/i);
  });

  it('prefixes UPDATE ... FROM', () => {
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
