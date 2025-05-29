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
      board_card_sources: {
        Row: {
          card_id: string | null
          id: string
          source_id: string | null
        }
        Insert: {
          card_id?: string | null
          id?: string
          source_id?: string | null
        }
        Update: {
          card_id?: string | null
          id?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_card_sources_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_card_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      board_card_tags: {
        Row: {
          card_id: string | null
          id: string
          tag: string | null
        }
        Insert: {
          card_id?: string | null
          id?: string
          tag?: string | null
        }
        Update: {
          card_id?: string | null
          id?: string
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_card_tags_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_cards: {
        Row: {
          board_id: string | null
          column_type: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_archived: boolean | null
          order_index: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          board_id?: string | null
          column_type?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          order_index?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          board_id?: string | null
          column_type?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          order_index?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_items: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          parent_id: string | null
          position: number | null
          space_id: string
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          position?: number | null
          space_id: string
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          position?: number | null
          space_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "board_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_items_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          is_read: boolean | null
          read_by: Json | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          read_by?: Json | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          read_by?: Json | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          last_activity: string | null
          name: string
          space_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_activity?: string | null
          name: string
          space_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_activity?: string | null
          name?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          confidence: number | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_starred: boolean | null
          nest_id: string
          related_items: Json | null
          source_id: string | null
          source_type: string
          space_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_starred?: boolean | null
          nest_id: string
          related_items?: Json | null
          source_id?: string | null
          source_type: string
          space_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_starred?: boolean | null
          nest_id?: string
          related_items?: Json | null
          source_id?: string | null
          source_type?: string
          space_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nest_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invited_email: string
          is_accepted: boolean | null
          nest_id: string
          status: string
          target_user_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_email: string
          is_accepted?: boolean | null
          nest_id: string
          status?: string
          target_user_id?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_email?: string
          is_accepted?: boolean | null
          nest_id?: string
          status?: string
          target_user_id?: string | null
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
          {
            foreignKeyName: "nest_invitations_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nest_members: {
        Row: {
          joined_at: string | null
          last_active_at: string | null
          nest_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          last_active_at?: string | null
          nest_id: string
          role?: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
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
      nest_settings: {
        Row: {
          custom_emojis: Json | null
          metadata: Json | null
          nest_id: string
          notification_settings: Json | null
          privacy_settings: Json | null
          theme: string | null
        }
        Insert: {
          custom_emojis?: Json | null
          metadata?: Json | null
          nest_id: string
          notification_settings?: Json | null
          privacy_settings?: Json | null
          theme?: string | null
        }
        Update: {
          custom_emojis?: Json | null
          metadata?: Json | null
          nest_id?: string
          notification_settings?: Json | null
          privacy_settings?: Json | null
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nest_settings_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: true
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
        ]
      }
      nests: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          meta: Json | null
          ref_id: string | null
          type: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          meta?: Json | null
          ref_id?: string | null
          type?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          meta?: Json | null
          ref_id?: string | null
          type?: string | null
          url?: string | null
        }
        Relationships: []
      }
      spaces: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          nest_id: string
          settings: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          nest_id: string
          settings?: Json | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          nest_id?: string
          settings?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "nests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          avatar_url: string | null
          current_space_id: string | null
          last_active: string
          status: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          current_space_id?: string | null
          last_active?: string
          status?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          current_space_id?: string | null
          last_active?: string
          status?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          updated_at?: string | null
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
