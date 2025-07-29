export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_color: string | null
          created_at: string | null
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          name: string
          points_required: number | null
        }
        Insert: {
          badge_color?: string | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points_required?: number | null
        }
        Update: {
          badge_color?: string | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points_required?: number | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          notes: string | null
          price: number | null
          session_type: string | null
          specialist_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          price?: number | null
          session_type?: string | null
          specialist_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          price?: number | null
          session_type?: string | null
          specialist_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          message_type: string | null
          reply_to: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          message_type?: string | null
          reply_to?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          message_type?: string | null
          reply_to?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_participants: {
        Row: {
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          room_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          room_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          room_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      document_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category_id: string | null
          content: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_shared: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_shared?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_shared?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      focus_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          duration_minutes: number
          id: string
          interruptions: number | null
          notes: string | null
          points_earned: number | null
          session_type: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          duration_minutes: number
          id?: string
          interruptions?: number | null
          notes?: string | null
          points_earned?: number | null
          session_type: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          interruptions?: number | null
          notes?: string | null
          points_earned?: number | null
          session_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      game_scores: {
        Row: {
          accuracy_percentage: number | null
          completion_time: unknown | null
          created_at: string | null
          game_id: string
          id: string
          level_reached: number | null
          points_earned: number | null
          score: number
          user_id: string
        }
        Insert: {
          accuracy_percentage?: number | null
          completion_time?: unknown | null
          created_at?: string | null
          game_id: string
          id?: string
          level_reached?: number | null
          points_earned?: number | null
          score: number
          user_id: string
        }
        Update: {
          accuracy_percentage?: number | null
          completion_time?: unknown | null
          created_at?: string | null
          game_id?: string
          id?: string
          level_reached?: number | null
          points_earned?: number | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      games: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          id: string
          name: string
          points_per_completion: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          id?: string
          name: string
          points_per_completion?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          id?: string
          name?: string
          points_per_completion?: number | null
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          created_at: string | null
          id: string
          mood_intensity: number | null
          mood_type: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mood_intensity?: number | null
          mood_type: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mood_intensity?: number | null
          mood_type?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          id: string
          last_activity: string | null
          level: number | null
          parent_email: string | null
          points: number | null
          preferences: Json | null
          streak_days: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          id: string
          last_activity?: string | null
          level?: number | null
          parent_email?: string | null
          points?: number | null
          preferences?: Json | null
          streak_days?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          id?: string
          last_activity?: string | null
          level?: number | null
          parent_email?: string | null
          points?: number | null
          preferences?: Json | null
          streak_days?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      progress_records: {
        Row: {
          activity_id: string | null
          activity_type: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          points_earned: number | null
          progress_data: Json | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          activity_type: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          points_earned?: number | null
          progress_data?: Json | null
          user_id: string
        }
        Update: {
          activity_id?: string | null
          activity_type?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          points_earned?: number | null
          progress_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      specialists: {
        Row: {
          availability_schedule: Json | null
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          credentials: string[] | null
          experience_years: number | null
          first_name: string
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          last_name: string
          profile_image_url: string | null
          rating: number | null
          specialization: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability_schedule?: Json | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credentials?: string[] | null
          experience_years?: number | null
          first_name: string
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          last_name: string
          profile_image_url?: string | null
          rating?: number | null
          specialization: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability_schedule?: Json | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credentials?: string[] | null
          experience_years?: number | null
          first_name?: string
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          last_name?: string
          profile_image_url?: string | null
          rating?: number | null
          specialization?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          points_earned: number | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          points_earned?: number | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          points_earned?: number | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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