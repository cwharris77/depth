import type { Database } from '@/lib/database.types';

export const tables = {
  depthChartEntries: 'depth_chart_entries',
  depthOverrides: 'depth_overrides',
  games: 'games',
  ingestionRuns: 'ingestion_runs',
  playerStats: 'player_stats',
  players: 'players',
  rosterHistory: 'roster_history',
  schedules: 'schedules',
  sharedBoards: 'shared_boards',
  specialTeamsSlots: 'special_teams_slots',
  teamCoachSeasons: 'team_coach_seasons',
  teamFormations: 'team_formations',
  teamSeasonStats: 'team_season_stats',
  teamStats: 'team_stats',
  teams: 'teams',
  uniformReleaseWatches: 'uniform_release_watches',
  uniforms: 'uniforms',
  userSettings: 'user_settings',
} satisfies Record<string, keyof Database['public']['Tables']>;