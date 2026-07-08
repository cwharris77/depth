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
      roster_overlays: {
        Row: {
          created_at: string
          depth_rank: number
          id: string
          player_id: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depth_rank: number
          id?: string
          player_id: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          depth_rank?: number
          id?: string
          player_id?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_overlays_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_overlays_team_id_fkey"
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
      teams: {
        Row: {
          abbrev: string
          city: string
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          conference: string
          division: string
          espn_id: string | null
          id: string
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          on_accent: string | null
          ui_accent: string | null
          updated_at: string
        }
        Insert: {
          abbrev: string
          city: string
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          conference: string
          division: string
          espn_id?: string | null
          id: string
          logo_dark_url?: string | null
          logo_url?: string | null
          name: string
          on_accent?: string | null
          ui_accent?: string | null
          updated_at?: string
        }
        Update: {
          abbrev?: string
          city?: string
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          conference?: string
          division?: string
          espn_id?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          on_accent?: string | null
          ui_accent?: string | null
          updated_at?: string
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
          source: string
          team_id: string
          ui_accent: string
          updated_at: string
          year_end: number | null
          year_start: number | null
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
          source: string
          team_id: string
          ui_accent: string
          updated_at?: string
          year_end?: number | null
          year_start?: number | null
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
          source?: string
          team_id?: string
          ui_accent?: string
          updated_at?: string
          year_end?: number | null
          year_start?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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

