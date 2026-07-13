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
      complaint_updates: {
        Row: {
          author_id: string
          author_role: Database["public"]["Enums"]["app_role"]
          complaint_id: string
          created_at: string
          id: string
          message: string
        }
        Insert: {
          author_id: string
          author_role: Database["public"]["Enums"]["app_role"]
          complaint_id: string
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          author_id?: string
          author_role?: Database["public"]["Enums"]["app_role"]
          complaint_id?: string
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_updates_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["complaint_category"] | null
          description: string
          feedback: string | null
          id: string
          image_url: string | null
          is_rated: boolean
          priority: Database["public"]["Enums"]["complaint_priority"]
          rated_at: string | null
          rating: number | null
          room_number: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["complaint_category"] | null
          description: string
          feedback?: string | null
          id?: string
          image_url?: string | null
          is_rated?: boolean
          priority?: Database["public"]["Enums"]["complaint_priority"]
          rated_at?: string | null
          rating?: number | null
          room_number?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["complaint_category"] | null
          description?: string
          feedback?: string | null
          id?: string
          image_url?: string | null
          is_rated?: boolean
          priority?: Database["public"]["Enums"]["complaint_priority"]
          rated_at?: string | null
          rating?: number | null
          room_number?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          created_by: string
          description: string | null
          id: string
          login_email: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          login_email: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          login_email?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          complaint_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          college: string
          created_at: string
          email: string
          id: string
          name: string
          room_number: string | null
        }
        Insert: {
          college?: string
          created_at?: string
          email: string
          id: string
          name: string
          room_number?: string | null
        }
        Update: {
          college?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          room_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["complaint_category"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["complaint_category"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["complaint_category"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_user_ids: { Args: never; Returns: string[] }
      get_department_user_id: {
        Args: { _category: Database["public"]["Enums"]["complaint_category"] }
        Returns: string
      }
      get_user_department: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["complaint_category"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "department"
      complaint_category:
        | "hostel"
        | "academics"
        | "transport"
        | "infrastructure"
      complaint_priority: "P1" | "P2" | "P3" | "P4"
      complaint_status: "pending" | "assigned" | "in_progress" | "resolved"
      notification_type: "assignment" | "update" | "completion" | "verification"
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
      app_role: ["admin", "student", "department"],
      complaint_category: [
        "hostel",
        "academics",
        "transport",
        "infrastructure",
      ],
      complaint_priority: ["P1", "P2", "P3", "P4"],
      complaint_status: ["pending", "assigned", "in_progress", "resolved"],
      notification_type: ["assignment", "update", "completion", "verification"],
    },
  },
} as const
