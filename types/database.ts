/**
 * Database types for Supabase.
 * These types are auto-generated from the database schema.
 * Run `pnpm db:types` to regenerate after schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PhotoStatus = "pending" | "approved" | "rejected";
export type PhotoSource = "photographer" | "user";
export type ModerationAction = "approved" | "rejected" | "blocked";
export type UserRole = "admin" | "moderator" | "photographer";
export type LeadOrigin = "qr_code" | "spontaneous" | "traffic" | "roleta" | "pesquisa";
export type ScreenStatus = "online" | "offline" | "paused";
export type AiGenerationStatus =
  | "uploading"
  | "queued"
  | "processing"
  | "copying"
  | "completed"
  | "failed"
  | "expired";

export interface Database {
  public: {
    Tables: {
      photographers: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photographers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_users: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      photos: {
        Row: {
          id: string;
          photographer_id: string | null;
          file_url: string;
          thumbnail_url: string | null;
          status: PhotoStatus;
          source: PhotoSource;
          user_name: string | null;
          user_email: string | null;
          created_at: string;
          approved_at: string | null;
          displayed_count: number;
        };
        Insert: {
          id?: string;
          photographer_id?: string | null;
          file_url: string;
          thumbnail_url?: string | null;
          status?: PhotoStatus;
          source: PhotoSource;
          user_name?: string | null;
          user_email?: string | null;
          created_at?: string;
          approved_at?: string | null;
          displayed_count?: number;
        };
        Update: {
          id?: string;
          photographer_id?: string | null;
          file_url?: string;
          thumbnail_url?: string | null;
          status?: PhotoStatus;
          source?: PhotoSource;
          user_name?: string | null;
          user_email?: string | null;
          created_at?: string;
          approved_at?: string | null;
          displayed_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "photos_photographer_id_fkey";
            columns: ["photographer_id"];
            isOneToOne: false;
            referencedRelation: "photographers";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string;
          franchise_interest: boolean;
          origin: LeadOrigin;
          lgpd_consent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email: string;
          franchise_interest?: boolean;
          origin?: LeadOrigin;
          lgpd_consent?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string;
          franchise_interest?: boolean;
          origin?: LeadOrigin;
          lgpd_consent?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      moderation_log: {
        Row: {
          id: string;
          photo_id: string | null;
          moderator_id: string | null;
          action: ModerationAction;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          photo_id?: string | null;
          moderator_id?: string | null;
          action: ModerationAction;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string | null;
          moderator_id?: string | null;
          action?: ModerationAction;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_log_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_log_moderator_id_fkey";
            columns: ["moderator_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          }
        ];
      };
      screens: {
        Row: {
          id: string;
          name: string;
          status: ScreenStatus;
          last_ping: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          status?: ScreenStatus;
          last_ping?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: ScreenStatus;
          last_ping?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      screen_queue: {
        Row: {
          id: string;
          photo_id: string | null;
          screen_id: string | null;
          position: number;
          displayed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          photo_id?: string | null;
          screen_id?: string | null;
          position: number;
          displayed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string | null;
          screen_id?: string | null;
          position?: number;
          displayed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "screen_queue_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "screen_queue_screen_id_fkey";
            columns: ["screen_id"];
            isOneToOne: false;
            referencedRelation: "screens";
            referencedColumns: ["id"];
          }
        ];
      };
      blocked_users: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          reason: string | null;
          blocked_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          reason?: string | null;
          blocked_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          reason?: string | null;
          blocked_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_by_fkey";
            columns: ["blocked_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_photo_templates: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          preview_url: string;
          template_image_url: string;
          prompt: string;
          aspect_ratio: string;
          resolution: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          preview_url: string;
          template_image_url: string;
          prompt: string;
          aspect_ratio?: string;
          resolution?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          preview_url?: string;
          template_image_url?: string;
          prompt?: string;
          aspect_ratio?: string;
          resolution?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_photo_generations: {
        Row: {
          id: string;
          lead_id: string;
          template_id: string | null;
          status: AiGenerationStatus;
          reference_photos: string[];
          variant_1_url: string | null;
          variant_1_fal_request_id: string | null;
          variant_1_status: string;
          variant_2_url: string | null;
          variant_2_fal_request_id: string | null;
          variant_2_status: string;
          variant_3_url: string | null;
          variant_3_fal_request_id: string | null;
          variant_3_status: string;
          error_message: string | null;
          processing_time_ms: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          template_id?: string | null;
          status?: AiGenerationStatus;
          reference_photos?: string[];
          variant_1_url?: string | null;
          variant_1_fal_request_id?: string | null;
          variant_1_status?: string;
          variant_2_url?: string | null;
          variant_2_fal_request_id?: string | null;
          variant_2_status?: string;
          variant_3_url?: string | null;
          variant_3_fal_request_id?: string | null;
          variant_3_status?: string;
          error_message?: string | null;
          processing_time_ms?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          lead_id?: string;
          template_id?: string;
          status?: AiGenerationStatus;
          reference_photos?: string[];
          variant_1_url?: string | null;
          variant_1_fal_request_id?: string | null;
          variant_1_status?: string;
          variant_2_url?: string | null;
          variant_2_fal_request_id?: string | null;
          variant_2_status?: string;
          variant_3_url?: string | null;
          variant_3_fal_request_id?: string | null;
          variant_3_status?: string;
          error_message?: string | null;
          processing_time_ms?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_photo_generations_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_photo_generations_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "ai_photo_templates";
            referencedColumns: ["id"];
          }
        ];
      };
      prize_wheel_spins: {
        Row: {
          id: string;
          lead_id: string;
          prize_slug: string;
          prize_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          prize_slug: string;
          prize_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          prize_slug?: string;
          prize_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prize_wheel_spins_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      survey_responses: {
        Row: {
          id: string;
          lead_id: string;
          answers: Record<string, string | number>;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          answers: Record<string, string | number>;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          answers?: Record<string, string | number>;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_responses_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      photo_status: PhotoStatus;
      photo_source: PhotoSource;
      moderation_action: ModerationAction;
      user_role: UserRole;
      lead_origin: LeadOrigin;
      screen_status: ScreenStatus;
      ai_generation_status: AiGenerationStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/**
 * Helper types for easier usage
 */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience type aliases
export type Photo = Tables<"photos">;
export type Lead = Tables<"leads">;
export type Photographer = Tables<"photographers">;
export type AdminUser = Tables<"admin_users">;
export type ModerationLog = Tables<"moderation_log">;
export type Screen = Tables<"screens">;
export type ScreenQueue = Tables<"screen_queue">;
export type BlockedUser = Tables<"blocked_users">;
export type AiPhotoTemplate = Tables<"ai_photo_templates">;
export type AiPhotoGeneration = Tables<"ai_photo_generations">;
export type SurveyResponse = Tables<"survey_responses">;
