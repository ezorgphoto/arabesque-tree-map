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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          city: string
          created_at: string
          employees_count: number
          id: string
          lat: number
          lng: number
          manager: string
          name: string
          notes: string
          revenue: number
        }
        Insert: {
          city?: string
          created_at?: string
          employees_count?: number
          id?: string
          lat?: number
          lng?: number
          manager?: string
          name: string
          notes?: string
          revenue?: number
        }
        Update: {
          city?: string
          created_at?: string
          employees_count?: number
          id?: string
          lat?: number
          lng?: number
          manager?: string
          name?: string
          notes?: string
          revenue?: number
        }
        Relationships: []
      }
      employees: {
        Row: {
          branch_id: string | null
          created_at: string
          department: string
          email: string
          full_name: string
          hired_at: string
          id: string
          job_title: string
          phone: string
          salary: number
          status: string
          user_id: string | null
          app_role: string
          org_unit: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          department?: string
          email?: string
          full_name: string
          hired_at?: string
          id?: string
          job_title?: string
          phone?: string
          salary?: number
          status?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          hired_at?: string
          id?: string
          job_title?: string
          phone?: string
          salary?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      org_nodes: {
        Row: {
          created_at: string
          department: string
          id: string
          notes: string
          parent_id: string | null
          person: string
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          department?: string
          id?: string
          notes?: string
          parent_id?: string | null
          person?: string
          position?: number
          title: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          notes?: string
          parent_id?: string | null
          person?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          attachments: Json
          created_at: string
          department: string
          department_type: string
          fields: Json
          file_url: string
          id: string
          metrics: Json
          period_date: string
          priority: string
          report_data: Json
          report_type: string
          review_notes: string
          reviewer: string
          status: string
          submitted_by: string
          submitter_name: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          department?: string
          department_type?: string
          fields?: Json
          file_url?: string
          id?: string
          metrics?: Json
          period_date?: string
          priority?: string
          report_data?: Json
          report_type?: string
          review_notes?: string
          reviewer?: string
          status?: string
          submitted_by?: string
          submitter_name?: string
          title?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          department?: string
          department_type?: string
          fields?: Json
          file_url?: string
          id?: string
          metrics?: Json
          period_date?: string
          priority?: string
          report_data?: Json
          report_type?: string
          review_notes?: string
          reviewer?: string
          status?: string
          submitted_by?: string
          submitter_name?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          position: number
          priority: string
          status: string
          title: string
        }
        Insert: {
          assignee?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title: string
        }
        Update: {
          assignee?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      weekly_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          description: string
          end_time: string
          id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          description?: string
          end_time?: string
          id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          description?: string
          end_time?: string
          id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
