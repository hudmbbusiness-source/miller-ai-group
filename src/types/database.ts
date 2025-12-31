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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          title: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          title?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          title?: string | null
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          tags: string[] | null
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string | null
          tags?: string[] | null
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string | null
          tags?: string[] | null
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      boards: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          cover_image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          cover_image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          cover_image?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pins: {
        Row: {
          id: string
          user_id: string
          board_id: string
          type: 'link' | 'image'
          title: string
          url: string | null
          image_path: string | null
          notes: string | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          board_id: string
          type: 'link' | 'image'
          title: string
          url?: string | null
          image_path?: string | null
          notes?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          board_id?: string
          type?: 'link' | 'image'
          title?: string
          url?: string | null
          image_path?: string | null
          notes?: string | null
          tags?: string[] | null
          created_at?: string
        }
      }
      saved_links: {
        Row: {
          id: string
          user_id: string
          url: string
          title: string
          description: string | null
          tags: string[] | null
          category: string | null
          favicon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          title: string
          description?: string | null
          tags?: string[] | null
          category?: string | null
          favicon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          title?: string
          description?: string | null
          tags?: string[] | null
          category?: string | null
          favicon?: string | null
          created_at?: string
        }
      }
      files_index: {
        Row: {
          id: string
          user_id: string
          filename: string
          storage_path: string
          size: number
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          storage_path: string
          size: number
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          storage_path?: string
          size?: number
          mime_type?: string | null
          created_at?: string
        }
      }
      z_project_items: {
        Row: {
          id: string
          user_id: string
          section: string
          title: string
          description: string | null
          completed: boolean
          order_index: number
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          section: string
          title: string
          description?: string | null
          completed?: boolean
          order_index?: number
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          section?: string
          title?: string
          description?: string | null
          completed?: boolean
          order_index?: number
          category?: string | null
          created_at?: string
        }
      }
      site_content: {
        Row: {
          id: string
          key: string
          value: Json
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: 'short_term' | 'long_term' | 'milestone'
          status: 'active' | 'completed' | 'paused' | 'abandoned'
          target_date: string | null
          completed_date: string | null
          priority: number
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: 'short_term' | 'long_term' | 'milestone'
          status?: 'active' | 'completed' | 'paused' | 'abandoned'
          target_date?: string | null
          completed_date?: string | null
          priority?: number
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: 'short_term' | 'long_term' | 'milestone'
          status?: 'active' | 'completed' | 'paused' | 'abandoned'
          target_date?: string | null
          completed_date?: string | null
          priority?: number
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          image_url: string | null
          external_link: string | null
          category: 'want' | 'owned' | 'goal'
          priority: number
          notes: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          image_url?: string | null
          external_link?: string | null
          category?: 'want' | 'owned' | 'goal'
          priority?: number
          notes?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          external_link?: string | null
          category?: 'want' | 'owned' | 'goal'
          priority?: number
          notes?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      accomplishments: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          date: string | null
          link: string | null
          attachment_url: string | null
          visible: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: string
          date?: string | null
          link?: string | null
          attachment_url?: string | null
          visible?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string
          date?: string | null
          link?: string | null
          attachment_url?: string | null
          visible?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      resume_items: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: 'education' | 'startup' | 'achievement' | 'skill' | 'experience' | 'certification'
          start_date: string | null
          end_date: string | null
          is_current: boolean
          order_index: number
          visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: 'education' | 'startup' | 'achievement' | 'skill' | 'experience' | 'certification'
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          order_index?: number
          visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: 'education' | 'startup' | 'achievement' | 'skill' | 'experience' | 'certification'
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          order_index?: number
          visible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      resume_summary: {
        Row: {
          id: string
          user_id: string
          summary: string | null
          headline: string | null
          location: string | null
          email: string | null
          phone: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          summary?: string | null
          headline?: string | null
          location?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          summary?: string | null
          headline?: string | null
          location?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          slug: string
          name: string
          tagline: string | null
          description: string | null
          logo_url: string | null
          status: 'not_connected' | 'in_development' | 'live' | 'paused' | 'archived'
          is_featured: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          slug: string
          name: string
          tagline?: string | null
          description?: string | null
          logo_url?: string | null
          status?: 'not_connected' | 'in_development' | 'live' | 'paused' | 'archived'
          is_featured?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slug?: string
          name?: string
          tagline?: string | null
          description?: string | null
          logo_url?: string | null
          status?: 'not_connected' | 'in_development' | 'live' | 'paused' | 'archived'
          is_featured?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      project_links: {
        Row: {
          id: string
          project_id: string
          user_id: string
          label: string
          url: string
          icon: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          label: string
          url: string
          icon?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          label?: string
          url?: string
          icon?: string | null
          order_index?: number
          created_at?: string
        }
      }
      site_settings: {
        Row: {
          id: string
          owner_user_id: string | null
          site_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id?: string | null
          site_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string | null
          site_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      business_card_settings: {
        Row: {
          id: string
          user_id: string
          name: string
          title: string
          company: string
          email: string | null
          phone: string | null
          website: string | null
          linkedin_url: string | null
          instagram_url: string | null
          github_url: string | null
          tagline: string | null
          show_projects: boolean
          projects_to_show: string[]
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          title?: string
          company?: string
          email?: string | null
          phone?: string | null
          website?: string | null
          linkedin_url?: string | null
          instagram_url?: string | null
          github_url?: string | null
          tagline?: string | null
          show_projects?: boolean
          projects_to_show?: string[]
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          title?: string
          company?: string
          email?: string | null
          phone?: string | null
          website?: string | null
          linkedin_url?: string | null
          instagram_url?: string | null
          github_url?: string | null
          tagline?: string | null
          show_projects?: boolean
          projects_to_show?: string[]
          theme?: string
          created_at?: string
          updated_at?: string
        }
      }
      media_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          description: string | null
          color: string
          icon: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          description?: string | null
          color?: string
          icon?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string
          icon?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      media_assets: {
        Row: {
          id: string
          user_id: string
          filename: string
          original_filename: string
          storage_path: string
          storage_bucket: string
          file_type: 'image' | 'video' | 'audio' | 'document' | 'animation' | 'svg' | 'other'
          mime_type: string
          file_size: number
          width: number | null
          height: number | null
          duration: number | null
          name: string
          description: string | null
          alt_text: string | null
          category_id: string | null
          tags: string[]
          public_url: string
          thumbnail_url: string | null
          metadata: Json
          order_index: number
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          original_filename: string
          storage_path: string
          storage_bucket?: string
          file_type: 'image' | 'video' | 'audio' | 'document' | 'animation' | 'svg' | 'other'
          mime_type: string
          file_size: number
          width?: number | null
          height?: number | null
          duration?: number | null
          name: string
          description?: string | null
          alt_text?: string | null
          category_id?: string | null
          tags?: string[]
          public_url: string
          thumbnail_url?: string | null
          metadata?: Json
          order_index?: number
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          original_filename?: string
          storage_path?: string
          storage_bucket?: string
          file_type?: 'image' | 'video' | 'audio' | 'document' | 'animation' | 'svg' | 'other'
          mime_type?: string
          file_size?: number
          width?: number | null
          height?: number | null
          duration?: number | null
          name?: string
          description?: string | null
          alt_text?: string | null
          category_id?: string | null
          tags?: string[]
          public_url?: string
          thumbnail_url?: string | null
          metadata?: Json
          order_index?: number
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      system_health_snapshots: {
        Row: {
          id: string
          user_id: string
          api_status: Json
          database_status: Json
          storage_status: Json
          env_status: Json
          overall_status: 'healthy' | 'degraded' | 'critical' | 'unknown'
          issues_count: number
          warnings_count: number
          check_duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          api_status: Json
          database_status: Json
          storage_status: Json
          env_status: Json
          overall_status?: 'healthy' | 'degraded' | 'critical' | 'unknown'
          issues_count?: number
          warnings_count?: number
          check_duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          api_status?: Json
          database_status?: Json
          storage_status?: Json
          env_status?: Json
          overall_status?: 'healthy' | 'degraded' | 'critical' | 'unknown'
          issues_count?: number
          warnings_count?: number
          check_duration_ms?: number | null
          created_at?: string
        }
      }
      diagnostic_logs: {
        Row: {
          id: string
          user_id: string
          session_id: string
          type: 'health_check' | 'issue_analysis' | 'code_analysis' | 'auto_fix' | 'rollback'
          request_description: string | null
          request_context: Json
          analysis_result: Json | null
          issues_found: Json
          suggestions: Json
          proposed_fix: Json | null
          fix_description: string | null
          fix_status: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed' | 'rolled_back'
          fix_applied_at: string | null
          fix_result: Json | null
          rollback_data: Json | null
          can_rollback: boolean
          ai_provider: string | null
          ai_model: string | null
          tokens_used: number | null
          duration_ms: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string
          type: 'health_check' | 'issue_analysis' | 'code_analysis' | 'auto_fix' | 'rollback'
          request_description?: string | null
          request_context?: Json
          analysis_result?: Json | null
          issues_found?: Json
          suggestions?: Json
          proposed_fix?: Json | null
          fix_description?: string | null
          fix_status?: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed' | 'rolled_back'
          fix_applied_at?: string | null
          fix_result?: Json | null
          rollback_data?: Json | null
          can_rollback?: boolean
          ai_provider?: string | null
          ai_model?: string | null
          tokens_used?: number | null
          duration_ms?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          type?: 'health_check' | 'issue_analysis' | 'code_analysis' | 'auto_fix' | 'rollback'
          request_description?: string | null
          request_context?: Json
          analysis_result?: Json | null
          issues_found?: Json
          suggestions?: Json
          proposed_fix?: Json | null
          fix_description?: string | null
          fix_status?: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed' | 'rolled_back'
          fix_applied_at?: string | null
          fix_result?: Json | null
          rollback_data?: Json | null
          can_rollback?: boolean
          ai_provider?: string | null
          ai_model?: string | null
          tokens_used?: number | null
          duration_ms?: number | null
          created_at?: string
          updated_at?: string
        }
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
