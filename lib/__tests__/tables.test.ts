import { describe, expect, it } from 'vitest';
import { tables } from '@/lib/supabase/tables';
import type { Database } from '@/lib/database.types';

type TableKey = keyof Database['public']['Tables'];

function assertMatchesDatabaseKeys<T extends Record<string, TableKey>>(_t: T): void {}

describe('tables', () => {
  it('table const values are type-checked against Database public table keys', () => {
    assertMatchesDatabaseKeys(tables);
  });

  it('tables const has entries for every Database public table', () => {
    const expectedKeys = [
      'brand_colors',
      'depth_chart_entries',
      'depth_overrides',
      'games',
      'ingestion_runs',
      'player_recent_snaps',
      'player_stats',
      'players',
      'roster_history',
      'schedules',
      'shared_boards',
      'special_teams_slots',
      'team_coach_seasons',
      'team_formations',
      'team_season_stats',
      'team_stats',
      'teams',
      'uniform_release_watches',
      'uniforms',
      'user_settings',
    ] as const;

    const values = Object.values(tables);
    expect(values).toHaveLength(expectedKeys.length);
    for (const key of expectedKeys) {
      expect(values).toContain(key);
    }
  });
});
