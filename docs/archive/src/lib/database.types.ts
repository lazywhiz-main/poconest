export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      board_items: {
        Row: {
          column_type: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_archived: boolean
          metadata: Json | null
          nest_id: string
          order_index: number
          source_message_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          column_type: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          nest_id: string
          order_index: number
          source_message_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          column_type?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          nest_id?: string
          order_index?: number
          source_message_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_items_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_items_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          has_pinned_to_board: boolean
          id: string
          is_edited: boolean
          metadata: Json | null
          nest_id: string
          read_by: string[] | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          has_pinned_to_board?: boolean
          id?: string
          is_edited?: boolean
          metadata?: Json | null
          nest_id: string
          read_by?: string[] | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          has_pinned_to_board?: boolean
          id?: string
          is_edited?: boolean
          metadata?: Json | null
          nest_id?: string
          read_by?: string[] | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      nest_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          is_accepted: boolean
          nest_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          is_accepted?: boolean
          nest_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          is_accepted?: boolean
          nest_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "nest_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nest_invitations_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
        ]
      }
      nest_members: {
        Row: {
          joined_at: string
          last_active_at: string | null
          nest_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_active_at?: string | null
          nest_id: string
          role: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_active_at?: string | null
          nest_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nest_members_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nest_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nests: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_nest_id: string | null
          display_name: string
          email: string
          id: string
          last_seen_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_nest_id?: string | null
          display_name: string
          email: string
          id: string
          last_seen_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_nest_id?: string | null
          display_name?: string
          email?: string
          id?: string
          last_seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_default_nest_id_fkey"
            columns: ["default_nest_id"]
            isOneToOne: false
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      get_nest_members: {
        Args: { p_nest_id: string }
        Returns: {
          joined_at: string
          last_active_at: string | null
          nest_id: string
          role: string
          user_id: string
        }[]
      }
      get_user_nests: {
        Args: { user_id: string }
        Returns: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
