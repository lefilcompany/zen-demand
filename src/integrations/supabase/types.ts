export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      board_members: {
        Row: {
          added_by: string | null
          board_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          user_id: string
        }
        Insert: {
          added_by?: string | null
          board_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          user_id: string
        }
        Update: {
          added_by?: string | null
          board_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          monthly_demand_limit: number | null
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          monthly_demand_limit?: number | null
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          monthly_demand_limit?: number | null
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_assignees: {
        Row: {
          assigned_at: string | null
          demand_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          demand_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          demand_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_assignees_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_attachments: {
        Row: {
          created_at: string
          demand_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          interaction_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          demand_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          interaction_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          demand_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          interaction_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_attachments_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_attachments_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "demand_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_interactions: {
        Row: {
          content: string | null
          created_at: string
          demand_id: string
          id: string
          interaction_type: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          demand_id: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          demand_id?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_interactions_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_request_attachments: {
        Row: {
          comment_id: string | null
          created_at: string
          demand_request_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          uploaded_by: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          demand_request_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          uploaded_by: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          demand_request_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_request_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "demand_request_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_request_attachments_demand_request_id_fkey"
            columns: ["demand_request_id"]
            isOneToOne: false
            referencedRelation: "demand_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_request_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          request_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "demand_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_requests: {
        Row: {
          board_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string | null
          rejection_reason: string | null
          responded_at: string | null
          responded_by: string | null
          service_id: string | null
          status: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string | null
          rejection_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          service_id?: string | null
          status?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          board_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string | null
          rejection_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          service_id?: string | null
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_requests_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_system: boolean | null
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          name?: string
        }
        Relationships: []
      }
      demand_subtasks: {
        Row: {
          completed: boolean
          created_at: string
          demand_id: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          demand_id: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          demand_id?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_subtasks_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_templates: {
        Row: {
          board_id: string | null
          created_at: string
          created_by: string
          description_template: string | null
          id: string
          name: string
          priority: string | null
          service_id: string | null
          team_id: string
          title_template: string | null
          updated_at: string
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          created_by: string
          description_template?: string | null
          id?: string
          name: string
          priority?: string | null
          service_id?: string | null
          team_id: string
          title_template?: string | null
          updated_at?: string
        }
        Update: {
          board_id?: string | null
          created_at?: string
          created_by?: string
          description_template?: string | null
          id?: string
          name?: string
          priority?: string | null
          service_id?: string | null
          team_id?: string
          title_template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_templates_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_time_entries: {
        Row: {
          created_at: string
          demand_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demand_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demand_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_time_entries_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          archived: boolean
          archived_at: string | null
          assigned_to: string | null
          board_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          last_started_at: string | null
          priority: string | null
          service_id: string | null
          status_id: string
          team_id: string
          time_in_progress_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          assigned_to?: string | null
          board_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          last_started_at?: string | null
          priority?: string | null
          service_id?: string | null
          status_id: string
          team_id: string
          time_in_progress_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          assigned_to?: string | null
          board_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          last_started_at?: string | null
          priority?: string | null
          service_id?: string | null
          status_id?: string
          team_id?: string
          time_in_progress_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "demand_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          board_id: string | null
          created_at: string
          created_by: string
          description: string | null
          estimated_hours: number
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          estimated_hours?: number
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          board_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_hours?: number
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_join_requests: {
        Row: {
          id: string
          message: string | null
          requested_at: string
          responded_at: string | null
          responded_by: string | null
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          message?: string | null
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          message?: string | null
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          access_code: string
          active: boolean | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          monthly_demand_limit: number | null
          name: string
          scope_description: string | null
          updated_at: string
        }
        Insert: {
          access_code: string
          active?: boolean | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          monthly_demand_limit?: number | null
          name: string
          scope_description?: string | null
          updated_at?: string
        }
        Update: {
          access_code?: string
          active?: boolean | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          monthly_demand_limit?: number | null
          name?: string
          scope_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preference_key: string
          preference_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference_key: string
          preference_value?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_demand: { Args: { _team_id: string }; Returns: boolean }
      check_access_code_exists: { Args: { code: string }; Returns: boolean }
      get_board_role: {
        Args: { _board_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      get_monthly_demand_count: {
        Args: { _month: number; _team_id: string; _year: number }
        Returns: number
      }
      get_team_by_access_code: {
        Args: { code: string }
        Returns: {
          created_at: string
          description: string
          id: string
          name: string
        }[]
      }
      get_user_board_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_team_ids: { Args: { _user_id: string }; Returns: string[] }
      has_board_role: {
        Args: {
          _board_id: string
          _role: Database["public"]["Enums"]["team_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_team_role: {
        Args: {
          _role: Database["public"]["Enums"]["team_role"]
          _team_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_board_admin_in_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_board_admin_or_moderator: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      is_board_member: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_admin_or_moderator: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_admin_or_moderator_for_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      team_role: "admin" | "moderator" | "requester" | "executor"
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
  public: {
    Enums: {
      app_role: ["admin", "member"],
      team_role: ["admin", "moderator", "requester", "executor"],
    },
  },
} as const
