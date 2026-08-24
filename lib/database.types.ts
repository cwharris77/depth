export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          id: boolean
          maintenance_message: string | null
          minimum_supported_build: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          maintenance_message?: string | null
          minimum_supported_build?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          maintenance_message?: string | null
          minimum_supported_build?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_events: {
        Row: {
          created_at: string
          error_category: string | null
          event_name: string
          id: string
        }
        Insert: {
          created_at?: string
          error_category?: string | null
          event_name: string
          id?: string
        }
        Update: {
          created_at?: string
          error_category?: string | null
          event_name?: string
          id?: string
        }
        Relationships: []
      }
      brand_colors: {
        Row: {
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          on_accent: string | null
          team_id: string
          ui_accent: string | null
          updated_at: string
        }
        Insert: {
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          on_accent?: string | null
          team_id: string
          ui_accent?: string | null
          updated_at?: string
        }
        Update: {
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          on_accent?: string | null
          team_id?: string
          ui_accent?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_colors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      depth_chart_entries: {
        Row: {
          depth_rank: number
          id: string
          player_id: string
          position: string
          team_id: string
          updated_at: string
        }
        Insert: {
          depth_rank: number
          id?: string
          player_id: string
          position: string
          team_id: string
          updated_at?: string
        }
        Update: {
          depth_rank?: number
          id?: string
          player_id?: string
          position?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depth_chart_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depth_chart_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      depth_overrides: {
        Row: {
          player_ids: string[]
          position: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          player_ids: string[]
          position: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          player_ids?: string[]
          position?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "depth_overrides_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_moneyline: number | null
          away_score: number | null
          away_spread_odds: number | null
          away_team_id: string
          game_id: string
          game_type: string
          gameday: string | null
          gametime: string | null
          home_moneyline: number | null
          home_score: number | null
          home_spread_odds: number | null
          home_team_id: string
          location: string | null
          market_updated_at: string | null
          over_odds: number | null
          season: number
          spread_line: number | null
          total_line: number | null
          under_odds: number | null
          updated_at: string
          week: number | null
        }
        Insert: {
          away_moneyline?: number | null
          away_score?: number | null
          away_spread_odds?: number | null
          away_team_id: string
          game_id: string
          game_type: string
          gameday?: string | null
          gametime?: string | null
          home_moneyline?: number | null
          home_score?: number | null
          home_spread_odds?: number | null
          home_team_id: string
          location?: string | null
          market_updated_at?: string | null
          over_odds?: number | null
          season: number
          spread_line?: number | null
          total_line?: number | null
          under_odds?: number | null
          updated_at?: string
          week?: number | null
        }
        Update: {
          away_moneyline?: number | null
          away_score?: number | null
          away_spread_odds?: number | null
          away_team_id?: string
          game_id?: string
          game_type?: string
          gameday?: string | null
          gametime?: string | null
          home_moneyline?: number | null
          home_score?: number | null
          home_spread_odds?: number | null
          home_team_id?: string
          location?: string | null
          market_updated_at?: string | null
          over_odds?: number | null
          season?: number
          spread_line?: number | null
          total_line?: number | null
          under_odds?: number | null
          updated_at?: string
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_season_fkey"
            columns: ["away_team_id", "season"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["team_id", "season"]
          },
          {
            foreignKeyName: "games_home_team_id_season_fkey"
            columns: ["home_team_id", "season"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["team_id", "season"]
          },
        ]
      }
      ingestion_runs: {
        Row: {
          created_at: string
          errors: Json | null
          finished_at: string | null
          id: string
          source: string
          started_at: string
          status: string
          teams_written: number | null
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          source?: string
          started_at: string
          status: string
          teams_written?: number | null
        }
        Update: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: string
          teams_written?: number | null
        }
        Relationships: []
      }
      player_recent_snaps: {
        Row: {
          defense_pct: number | null
          defense_snaps: number
          games: number
          offense_pct: number | null
          offense_snaps: number
          player_id: string
          season: number
          source: string
          special_teams_pct: number | null
          special_teams_snaps: number
          team_id: string
          updated_at: string
          window_end_week: number
          window_game_ids: string[]
          window_start_week: number
        }
        Insert: {
          defense_pct?: number | null
          defense_snaps: number
          games: number
          offense_pct?: number | null
          offense_snaps: number
          player_id: string
          season: number
          source: string
          special_teams_pct?: number | null
          special_teams_snaps: number
          team_id: string
          updated_at?: string
          window_end_week: number
          window_game_ids: string[]
          window_start_week: number
        }
        Update: {
          defense_pct?: number | null
          defense_snaps?: number
          games?: number
          offense_pct?: number | null
          offense_snaps?: number
          player_id?: string
          season?: number
          source?: string
          special_teams_pct?: number | null
          special_teams_snaps?: number
          team_id?: string
          updated_at?: string
          window_end_week?: number
          window_game_ids?: string[]
          window_start_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_recent_snaps_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          attempts: number | null
          carries: number | null
          completions: number | null
          def_interceptions: number | null
          def_sacks: number | null
          def_tackles_solo: number | null
          fg_att: number | null
          fg_made: number | null
          games: number | null
          passing_interceptions: number | null
          passing_tds: number | null
          passing_yards: number | null
          player_id: string
          receiving_tds: number | null
          receiving_yards: number | null
          receptions: number | null
          rushing_tds: number | null
          rushing_yards: number | null
          season: number
          season_type: string
          targets: number | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          carries?: number | null
          completions?: number | null
          def_interceptions?: number | null
          def_sacks?: number | null
          def_tackles_solo?: number | null
          fg_att?: number | null
          fg_made?: number | null
          games?: number | null
          passing_interceptions?: number | null
          passing_tds?: number | null
          passing_yards?: number | null
          player_id: string
          receiving_tds?: number | null
          receiving_yards?: number | null
          receptions?: number | null
          rushing_tds?: number | null
          rushing_yards?: number | null
          season: number
          season_type?: string
          targets?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          carries?: number | null
          completions?: number | null
          def_interceptions?: number | null
          def_sacks?: number | null
          def_tackles_solo?: number | null
          fg_att?: number | null
          fg_made?: number | null
          games?: number | null
          passing_interceptions?: number | null
          passing_tds?: number | null
          passing_yards?: number | null
          player_id?: string
          receiving_tds?: number | null
          receiving_yards?: number | null
          receptions?: number | null
          rushing_tds?: number | null
          rushing_yards?: number | null
          season?: number
          season_type?: string
          targets?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number | null
          bio: string | null
          college: string | null
          experience: number | null
          height: string | null
          id: string
          name: string
          number: number | null
          photo_url: string | null
          position: string
          status: string | null
          team_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          college?: string | null
          experience?: number | null
          height?: string | null
          id: string
          name: string
          number?: number | null
          photo_url?: string | null
          position: string
          status?: string | null
          team_id: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          college?: string | null
          experience?: number | null
          height?: string | null
          id?: string
          name?: string
          number?: number | null
          photo_url?: string | null
          position?: string
          status?: string | null
          team_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_history: {
        Row: {
          college: string | null
          depth_rank: number
          espn_id: string | null
          gsis_id: string
          headshot_url: string | null
          height: string | null
          name: string
          number: number | null
          player_order: number
          position: string
          season: number
          team_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          college?: string | null
          depth_rank: number
          espn_id?: string | null
          gsis_id: string
          headshot_url?: string | null
          height?: string | null
          name: string
          number?: number | null
          player_order: number
          position: string
          season: number
          team_id: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          college?: string | null
          depth_rank?: number
          espn_id?: string | null
          gsis_id?: string
          headshot_url?: string | null
          height?: string | null
          name?: string
          number?: number | null
          player_order?: number
          position?: string
          season?: number
          team_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          season: number
          team_id: string
          updated_at: string
        }
        Insert: {
          season: number
          team_id: string
          updated_at?: string
        }
        Update: {
          season?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_boards: {
        Row: {
          created_at: string
          owner_name: string
          slug: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          owner_name: string
          slug: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          owner_name?: string
          slug?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_boards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      special_teams_slots: {
        Row: {
          id: string
          label: string
          player_id: string | null
          team_id: string
          updated_at: string
          x: number | null
          y: number | null
        }
        Insert: {
          id: string
          label: string
          player_id?: string | null
          team_id: string
          updated_at?: string
          x?: number | null
          y?: number | null
        }
        Update: {
          id?: string
          label?: string
          player_id?: string | null
          team_id?: string
          updated_at?: string
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "special_teams_slots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_teams_slots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_coach_seasons: {
        Row: {
          coach_experience: number
          coach_name: string
          season: number
          source: string
          team_id: string
          updated_at: string
        }
        Insert: {
          coach_experience: number
          coach_name: string
          season: number
          source?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          coach_experience?: number
          coach_name?: string
          season?: number
          source?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_coach_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_formations: {
        Row: {
          alignment: string
          pct: number
          personnel: string
          rank: number
          season: number
          team_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          alignment: string
          pct: number
          personnel: string
          rank: number
          season: number
          team_id: string
          unit: string
          updated_at?: string
        }
        Update: {
          alignment?: string
          pct?: number
          personnel?: string
          rank?: number
          season?: number
          team_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_formations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_season_stats: {
        Row: {
          attempts: number | null
          carries: number | null
          completions: number | null
          def_fumbles: number | null
          def_fumbles_forced: number | null
          def_interception_yards: number | null
          def_interceptions: number | null
          def_pass_defended: number | null
          def_qb_hits: number | null
          def_sack_yards: number | null
          def_sacks: number | null
          def_safeties: number | null
          def_tackle_assists: number | null
          def_tackles_for_loss: number | null
          def_tackles_for_loss_yards: number | null
          def_tackles_solo: number | null
          def_tackles_with_assist: number | null
          def_tds: number | null
          fg_att: number | null
          fg_blocked: number | null
          fg_blocked_distance: number[] | null
          fg_blocked_list: number[] | null
          fg_long: number | null
          fg_made: number | null
          fg_made_0_19: number | null
          fg_made_20_29: number | null
          fg_made_30_39: number | null
          fg_made_40_49: number | null
          fg_made_50_: number | null
          fg_made_distance: number[] | null
          fg_made_list: number[] | null
          fg_missed: number | null
          fg_missed_0_19: number | null
          fg_missed_20_29: number | null
          fg_missed_30_39: number | null
          fg_missed_40_49: number | null
          fg_missed_50_: number | null
          fg_missed_distance: number[] | null
          fg_missed_list: number[] | null
          fg_pct: number | null
          fumble_recovery_opp: number | null
          fumble_recovery_own: number | null
          fumble_recovery_tds: number | null
          fumble_recovery_yards_opp: number | null
          fumble_recovery_yards_own: number | null
          fumbles_forced_by_opp: number | null
          fumbles_lost_total: number | null
          fumbles_not_forced: number | null
          fumbles_out_of_bounds: number | null
          fumbles_total: number | null
          games: number | null
          gwfg_att: number | null
          gwfg_blocked: number | null
          gwfg_distance_list: number[] | null
          gwfg_made: number | null
          gwfg_missed: number | null
          kickoff_return_yards: number | null
          kickoff_returns: number | null
          misc_yards: number | null
          passing_10: number | null
          passing_16: number | null
          passing_20: number | null
          passing_2pt_conversions: number | null
          passing_40: number | null
          passing_air_yards: number | null
          passing_cpoe: number | null
          passing_epa: number | null
          passing_first_downs: number | null
          passing_interceptions: number | null
          passing_tds: number | null
          passing_yards: number | null
          passing_yards_after_catch: number | null
          pat_att: number | null
          pat_blocked: number | null
          pat_made: number | null
          pat_missed: number | null
          pat_pct: number | null
          penalties: number | null
          penalty_yards: number | null
          pt_att: number | null
          pt_blocked: number | null
          pt_downed: number | null
          pt_fair_caught: number | null
          pt_inside_20: number | null
          pt_long: number | null
          pt_net_yards: number | null
          pt_out_of_bounds: number | null
          pt_return_tds: number | null
          pt_return_yards: number | null
          pt_returned: number | null
          pt_touchback: number | null
          pt_yards: number | null
          punt_return_yards: number | null
          punt_returns: number | null
          receiving_10: number | null
          receiving_16: number | null
          receiving_20: number | null
          receiving_2pt_conversions: number | null
          receiving_40: number | null
          receiving_air_yards: number | null
          receiving_epa: number | null
          receiving_first_downs: number | null
          receiving_fumbles: number | null
          receiving_fumbles_lost: number | null
          receiving_tds: number | null
          receiving_yards: number | null
          receiving_yards_after_catch: number | null
          receptions: number | null
          rushing_10: number | null
          rushing_12: number | null
          rushing_20: number | null
          rushing_2pt_conversions: number | null
          rushing_40: number | null
          rushing_epa: number | null
          rushing_first_downs: number | null
          rushing_fumbles: number | null
          rushing_fumbles_lost: number | null
          rushing_tds: number | null
          rushing_yards: number | null
          sack_fumbles: number | null
          sack_fumbles_lost: number | null
          sack_yards_lost: number | null
          sacks_suffered: number | null
          season: number
          season_type: string
          special_teams_tds: number | null
          targets: number | null
          team_id: string
          timeouts: number | null
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          carries?: number | null
          completions?: number | null
          def_fumbles?: number | null
          def_fumbles_forced?: number | null
          def_interception_yards?: number | null
          def_interceptions?: number | null
          def_pass_defended?: number | null
          def_qb_hits?: number | null
          def_sack_yards?: number | null
          def_sacks?: number | null
          def_safeties?: number | null
          def_tackle_assists?: number | null
          def_tackles_for_loss?: number | null
          def_tackles_for_loss_yards?: number | null
          def_tackles_solo?: number | null
          def_tackles_with_assist?: number | null
          def_tds?: number | null
          fg_att?: number | null
          fg_blocked?: number | null
          fg_blocked_distance?: number[] | null
          fg_blocked_list?: number[] | null
          fg_long?: number | null
          fg_made?: number | null
          fg_made_0_19?: number | null
          fg_made_20_29?: number | null
          fg_made_30_39?: number | null
          fg_made_40_49?: number | null
          fg_made_50_?: number | null
          fg_made_distance?: number[] | null
          fg_made_list?: number[] | null
          fg_missed?: number | null
          fg_missed_0_19?: number | null
          fg_missed_20_29?: number | null
          fg_missed_30_39?: number | null
          fg_missed_40_49?: number | null
          fg_missed_50_?: number | null
          fg_missed_distance?: number[] | null
          fg_missed_list?: number[] | null
          fg_pct?: number | null
          fumble_recovery_opp?: number | null
          fumble_recovery_own?: number | null
          fumble_recovery_tds?: number | null
          fumble_recovery_yards_opp?: number | null
          fumble_recovery_yards_own?: number | null
          fumbles_forced_by_opp?: number | null
          fumbles_lost_total?: number | null
          fumbles_not_forced?: number | null
          fumbles_out_of_bounds?: number | null
          fumbles_total?: number | null
          games?: number | null
          gwfg_att?: number | null
          gwfg_blocked?: number | null
          gwfg_distance_list?: number[] | null
          gwfg_made?: number | null
          gwfg_missed?: number | null
          kickoff_return_yards?: number | null
          kickoff_returns?: number | null
          misc_yards?: number | null
          passing_10?: number | null
          passing_16?: number | null
          passing_20?: number | null
          passing_2pt_conversions?: number | null
          passing_40?: number | null
          passing_air_yards?: number | null
          passing_cpoe?: number | null
          passing_epa?: number | null
          passing_first_downs?: number | null
          passing_interceptions?: number | null
          passing_tds?: number | null
          passing_yards?: number | null
          passing_yards_after_catch?: number | null
          pat_att?: number | null
          pat_blocked?: number | null
          pat_made?: number | null
          pat_missed?: number | null
          pat_pct?: number | null
          penalties?: number | null
          penalty_yards?: number | null
          pt_att?: number | null
          pt_blocked?: number | null
          pt_downed?: number | null
          pt_fair_caught?: number | null
          pt_inside_20?: number | null
          pt_long?: number | null
          pt_net_yards?: number | null
          pt_out_of_bounds?: number | null
          pt_return_tds?: number | null
          pt_return_yards?: number | null
          pt_returned?: number | null
          pt_touchback?: number | null
          pt_yards?: number | null
          punt_return_yards?: number | null
          punt_returns?: number | null
          receiving_10?: number | null
          receiving_16?: number | null
          receiving_20?: number | null
          receiving_2pt_conversions?: number | null
          receiving_40?: number | null
          receiving_air_yards?: number | null
          receiving_epa?: number | null
          receiving_first_downs?: number | null
          receiving_fumbles?: number | null
          receiving_fumbles_lost?: number | null
          receiving_tds?: number | null
          receiving_yards?: number | null
          receiving_yards_after_catch?: number | null
          receptions?: number | null
          rushing_10?: number | null
          rushing_12?: number | null
          rushing_20?: number | null
          rushing_2pt_conversions?: number | null
          rushing_40?: number | null
          rushing_epa?: number | null
          rushing_first_downs?: number | null
          rushing_fumbles?: number | null
          rushing_fumbles_lost?: number | null
          rushing_tds?: number | null
          rushing_yards?: number | null
          sack_fumbles?: number | null
          sack_fumbles_lost?: number | null
          sack_yards_lost?: number | null
          sacks_suffered?: number | null
          season: number
          season_type?: string
          special_teams_tds?: number | null
          targets?: number | null
          team_id: string
          timeouts?: number | null
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          carries?: number | null
          completions?: number | null
          def_fumbles?: number | null
          def_fumbles_forced?: number | null
          def_interception_yards?: number | null
          def_interceptions?: number | null
          def_pass_defended?: number | null
          def_qb_hits?: number | null
          def_sack_yards?: number | null
          def_sacks?: number | null
          def_safeties?: number | null
          def_tackle_assists?: number | null
          def_tackles_for_loss?: number | null
          def_tackles_for_loss_yards?: number | null
          def_tackles_solo?: number | null
          def_tackles_with_assist?: number | null
          def_tds?: number | null
          fg_att?: number | null
          fg_blocked?: number | null
          fg_blocked_distance?: number[] | null
          fg_blocked_list?: number[] | null
          fg_long?: number | null
          fg_made?: number | null
          fg_made_0_19?: number | null
          fg_made_20_29?: number | null
          fg_made_30_39?: number | null
          fg_made_40_49?: number | null
          fg_made_50_?: number | null
          fg_made_distance?: number[] | null
          fg_made_list?: number[] | null
          fg_missed?: number | null
          fg_missed_0_19?: number | null
          fg_missed_20_29?: number | null
          fg_missed_30_39?: number | null
          fg_missed_40_49?: number | null
          fg_missed_50_?: number | null
          fg_missed_distance?: number[] | null
          fg_missed_list?: number[] | null
          fg_pct?: number | null
          fumble_recovery_opp?: number | null
          fumble_recovery_own?: number | null
          fumble_recovery_tds?: number | null
          fumble_recovery_yards_opp?: number | null
          fumble_recovery_yards_own?: number | null
          fumbles_forced_by_opp?: number | null
          fumbles_lost_total?: number | null
          fumbles_not_forced?: number | null
          fumbles_out_of_bounds?: number | null
          fumbles_total?: number | null
          games?: number | null
          gwfg_att?: number | null
          gwfg_blocked?: number | null
          gwfg_distance_list?: number[] | null
          gwfg_made?: number | null
          gwfg_missed?: number | null
          kickoff_return_yards?: number | null
          kickoff_returns?: number | null
          misc_yards?: number | null
          passing_10?: number | null
          passing_16?: number | null
          passing_20?: number | null
          passing_2pt_conversions?: number | null
          passing_40?: number | null
          passing_air_yards?: number | null
          passing_cpoe?: number | null
          passing_epa?: number | null
          passing_first_downs?: number | null
          passing_interceptions?: number | null
          passing_tds?: number | null
          passing_yards?: number | null
          passing_yards_after_catch?: number | null
          pat_att?: number | null
          pat_blocked?: number | null
          pat_made?: number | null
          pat_missed?: number | null
          pat_pct?: number | null
          penalties?: number | null
          penalty_yards?: number | null
          pt_att?: number | null
          pt_blocked?: number | null
          pt_downed?: number | null
          pt_fair_caught?: number | null
          pt_inside_20?: number | null
          pt_long?: number | null
          pt_net_yards?: number | null
          pt_out_of_bounds?: number | null
          pt_return_tds?: number | null
          pt_return_yards?: number | null
          pt_returned?: number | null
          pt_touchback?: number | null
          pt_yards?: number | null
          punt_return_yards?: number | null
          punt_returns?: number | null
          receiving_10?: number | null
          receiving_16?: number | null
          receiving_20?: number | null
          receiving_2pt_conversions?: number | null
          receiving_40?: number | null
          receiving_air_yards?: number | null
          receiving_epa?: number | null
          receiving_first_downs?: number | null
          receiving_fumbles?: number | null
          receiving_fumbles_lost?: number | null
          receiving_tds?: number | null
          receiving_yards?: number | null
          receiving_yards_after_catch?: number | null
          receptions?: number | null
          rushing_10?: number | null
          rushing_12?: number | null
          rushing_20?: number | null
          rushing_2pt_conversions?: number | null
          rushing_40?: number | null
          rushing_epa?: number | null
          rushing_first_downs?: number | null
          rushing_fumbles?: number | null
          rushing_fumbles_lost?: number | null
          rushing_tds?: number | null
          rushing_yards?: number | null
          sack_fumbles?: number | null
          sack_fumbles_lost?: number | null
          sack_yards_lost?: number | null
          sacks_suffered?: number | null
          season?: number
          season_type?: string
          special_teams_tds?: number | null
          targets?: number | null
          team_id?: string
          timeouts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_stats: {
        Row: {
          conference_losses: number | null
          conference_wins: number | null
          division_losses: number | null
          division_wins: number | null
          home_losses: number | null
          home_wins: number | null
          overall_losses: number | null
          overall_ties: number | null
          overall_wins: number | null
          playoff_seed: number | null
          point_differential: number | null
          points_against: number | null
          points_for: number | null
          road_losses: number | null
          road_wins: number | null
          season: number
          streak: string | null
          team_id: string
          updated_at: string
          win_percent: number | null
        }
        Insert: {
          conference_losses?: number | null
          conference_wins?: number | null
          division_losses?: number | null
          division_wins?: number | null
          home_losses?: number | null
          home_wins?: number | null
          overall_losses?: number | null
          overall_ties?: number | null
          overall_wins?: number | null
          playoff_seed?: number | null
          point_differential?: number | null
          points_against?: number | null
          points_for?: number | null
          road_losses?: number | null
          road_wins?: number | null
          season: number
          streak?: string | null
          team_id: string
          updated_at?: string
          win_percent?: number | null
        }
        Update: {
          conference_losses?: number | null
          conference_wins?: number | null
          division_losses?: number | null
          division_wins?: number | null
          home_losses?: number | null
          home_wins?: number | null
          overall_losses?: number | null
          overall_ties?: number | null
          overall_wins?: number | null
          playoff_seed?: number | null
          point_differential?: number | null
          points_against?: number | null
          points_for?: number | null
          road_losses?: number | null
          road_wins?: number | null
          season?: number
          streak?: string | null
          team_id?: string
          updated_at?: string
          win_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          abbrev: string
          city: string
          coach_espn_id: string | null
          coach_experience: number | null
          coach_name: string | null
          conference: string
          division: string
          espn_id: string | null
          id: string
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          abbrev: string
          city: string
          coach_espn_id?: string | null
          coach_experience?: number | null
          coach_name?: string | null
          conference: string
          division: string
          espn_id?: string | null
          id: string
          logo_dark_url?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          city?: string
          coach_espn_id?: string | null
          coach_experience?: number | null
          coach_name?: string | null
          conference?: string
          division?: string
          espn_id?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      uniform_release_watches: {
        Row: {
          id: string
          notified_at: string
          source_url: string
          title: string
        }
        Insert: {
          id?: string
          notified_at?: string
          source_url: string
          title: string
        }
        Update: {
          id?: string
          notified_at?: string
          source_url?: string
          title?: string
        }
        Relationships: []
      }
      uniforms: {
        Row: {
          color_accent: string
          color_primary: string
          color_secondary: string
          id: string
          image_path: string | null
          is_current: boolean
          kind: string
          name: string
          on_accent: string
          team_id: string
          ui_accent: string
          updated_at: string
          year_end: number | null
          year_start: number
        }
        Insert: {
          color_accent: string
          color_primary: string
          color_secondary: string
          id: string
          image_path?: string | null
          is_current?: boolean
          kind: string
          name: string
          on_accent: string
          team_id: string
          ui_accent: string
          updated_at?: string
          year_end?: number | null
          year_start: number
        }
        Update: {
          color_accent?: string
          color_primary?: string
          color_secondary?: string
          id?: string
          image_path?: string | null
          is_current?: boolean
          kind?: string
          name?: string
          on_accent?: string
          team_id?: string
          ui_accent?: string
          updated_at?: string
          year_end?: number | null
          year_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "uniforms_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          favorite_team_id: string | null
          last_team_id: string | null
          start_on_favorite: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          favorite_team_id?: string | null
          last_team_id?: string | null
          start_on_favorite?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          favorite_team_id?: string | null
          last_team_id?: string | null
          start_on_favorite?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_favorite_team_id_fkey"
            columns: ["favorite_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_last_team_id_fkey"
            columns: ["last_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      upsert_depth_override_group: {
        Args: { p_player_ids: string[]; p_position: string; p_team_id: string }
        Returns: {
          player_ids: string[]
          position: string
          team_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "depth_overrides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

