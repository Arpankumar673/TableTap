/**
 * TableTap Database Schema TypeScript Definitions
 * Aligned strictly with supabase/SQL_SETUP_COMPLETE.sql and @supabase/postgrest-js GenericSchema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          currency: string;
          timezone: string;
          tax_rate: number;
          service_charge_rate: number;
          phone: string | null;
          email: string | null;
          address: string | null;
          opening_hours: Json;
          is_accepting_orders: boolean;
          active: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          currency?: string;
          timezone?: string;
          tax_rate?: number;
          service_charge_rate?: number;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          opening_hours?: Json;
          is_accepting_orders?: boolean;
          active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          currency?: string;
          timezone?: string;
          tax_rate?: number;
          service_charge_rate?: number;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          opening_hours?: Json;
          is_accepting_orders?: boolean;
          active?: boolean;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_memberships: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: "owner" | "admin" | "kitchen";
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role?: "owner" | "admin" | "kitchen";
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: "owner" | "admin" | "kitchen";
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_memberships_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };
      restaurant_tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: string;
          label: string | null;
          capacity: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_number: string;
          label?: string | null;
          capacity?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          table_number?: string;
          label?: string | null;
          capacity?: number;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_qr_tokens: {
        Row: {
          id: string;
          restaurant_id: string | null;
          table_id: string;
          token_hash: string;
          token_prefix: string | null;
          qr_token_secret: string | null;
          active: boolean;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id?: string | null;
          table_id: string;
          token_hash: string;
          token_prefix?: string | null;
          qr_token_secret?: string | null;
          active?: boolean;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          active?: boolean;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      table_sessions: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          session_token: string;
          status: "open" | "closed";
          bill_requested: boolean;
          bill_requested_at: string | null;
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          session_token: string;
          status?: "open" | "closed";
          bill_requested?: boolean;
          bill_requested_at?: string | null;
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: {
          status?: "open" | "closed";
          bill_requested?: boolean;
          bill_requested_at?: string | null;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      preparation_stations: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          color_hex: string;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          color_hex?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color_hex?: string;
          sort_order?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          station_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          base_price: number;
          dietary_type: "veg" | "non-veg" | "vegan" | "egg";
          is_popular: boolean;
          is_featured: boolean;
          is_chef_special: boolean;
          prep_time_minutes: number;
          sort_order: number;
          active: boolean;
          available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          station_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          base_price: number;
          dietary_type?: "veg" | "non-veg" | "vegan" | "egg";
          is_popular?: boolean;
          is_featured?: boolean;
          is_chef_special?: boolean;
          prep_time_minutes?: number;
          sort_order?: number;
          active?: boolean;
          available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          station_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          base_price?: number;
          dietary_type?: "veg" | "non-veg" | "vegan" | "egg";
          is_popular?: boolean;
          is_featured?: boolean;
          is_chef_special?: boolean;
          prep_time_minutes?: number;
          sort_order?: number;
          active?: boolean;
          available?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          restaurant_id: string;
          product_id: string;
          name: string;
          sku: string | null;
          price: number;
          is_default: boolean;
          active: boolean;
          available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          product_id: string;
          name: string;
          sku?: string | null;
          price: number;
          is_default?: boolean;
          active?: boolean;
          available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sku?: string | null;
          price?: number;
          is_default?: boolean;
          active?: boolean;
          available?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      option_groups: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          required: boolean;
          min_select: number;
          max_select: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          required?: boolean;
          min_select?: number;
          max_select?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          required?: boolean;
          min_select?: number;
          max_select?: number;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      option_values: {
        Row: {
          id: string;
          restaurant_id: string | null;
          option_group_id: string;
          name: string;
          price_delta: number;
          is_default: boolean;
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id?: string | null;
          option_group_id: string;
          name: string;
          price_delta?: number;
          is_default?: boolean;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          price_delta?: number;
          is_default?: boolean;
          active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      product_option_groups: {
        Row: {
          product_id: string;
          option_group_id: string;
          sort_order: number;
        };
        Insert: {
          product_id: string;
          option_group_id: string;
          sort_order?: number;
        };
        Update: {
          sort_order?: number;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_session_id: string;
          table_id: string | null;
          table_number_snapshot: string | null;
          order_number: string;
          public_token: string;
          status: "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
          subtotal: number;
          discount: number;
          tax: number;
          service_charge: number;
          total: number;
          payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
          idempotency_key: string;
          customer_notes: string | null;
          accepted_at: string | null;
          preparing_at: string | null;
          ready_at: string | null;
          served_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_session_id: string;
          table_id?: string | null;
          table_number_snapshot?: string | null;
          order_number: string;
          public_token?: string;
          status?: "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
          subtotal: number;
          discount?: number;
          tax?: number;
          service_charge?: number;
          total: number;
          payment_status?: "unpaid" | "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
          idempotency_key: string;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
          subtotal?: number;
          discount?: number;
          tax?: number;
          service_charge?: number;
          total?: number;
          payment_status?: "unpaid" | "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
          cancellation_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["order_id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: string;
          restaurant_id: string | null;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name_snapshot: string;
          variant_name_snapshot: string | null;
          quantity: number;
          unit_price_snapshot: number;
          total_price_snapshot: number;
          station_id: string | null;
          station_name_snapshot: string | null;
          notes: string | null;
          status: "pending" | "preparing" | "ready" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id?: string | null;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name_snapshot: string;
          variant_name_snapshot?: string | null;
          quantity: number;
          unit_price_snapshot: number;
          total_price_snapshot: number;
          station_id?: string | null;
          station_name_snapshot?: string | null;
          notes?: string | null;
          status?: "pending" | "preparing" | "ready" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "preparing" | "ready" | "cancelled";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      order_item_options: {
        Row: {
          id: string;
          order_item_id: string;
          option_group_name_snapshot: string;
          option_value_name_snapshot: string;
          price_delta_snapshot: number;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          option_group_name_snapshot: string;
          option_value_name_snapshot: string;
          price_delta_snapshot: number;
        };
        Update: {
          price_delta_snapshot?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_options_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          }
        ];
      };
      order_status_events: {
        Row: {
          id: string;
          restaurant_id: string | null;
          order_id: string;
          from_status: string | null;
          to_status: string;
          actor_user_id: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id?: string | null;
          order_id: string;
          from_status?: string | null;
          to_status: string;
          actor_user_id?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          restaurant_id: string | null;
          order_id: string;
          amount: number;
          currency: string;
          provider: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          provider_signature: string | null;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id?: string | null;
          order_id: string;
          amount: number;
          currency?: string;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          provider_signature?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          provider_signature?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      onboard_restaurant: {
        Args: {
          p_name: string;
          p_slug: string;
          p_currency?: string;
          p_timezone?: string;
          p_phone?: string | null;
          p_address?: string | null;
        };
        Returns: Json;
      };
      resolve_table_qr: {
        Args: { p_token_hash: string };
        Returns: Json;
      };
      create_customer_order: {
        Args: {
          p_session_token: string;
          p_idempotency_key: string;
          p_items: Json;
          p_customer_notes?: string | null;
        };
        Returns: Json;
      };
      get_order_by_public_token: {
        Args: { p_public_token: string };
        Returns: Json;
      };
      get_session_orders: {
        Args: { p_session_token: string };
        Returns: Json;
      };
      request_table_bill: {
        Args: { p_session_token: string };
        Returns: Json;
      };
      resolve_session_context: {
        Args: { p_session_token: string };
        Returns: Json;
      };
      update_order_status_secure: {
        Args: {
          p_order_id: string;
          p_new_status: "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
          p_reason?: string | null;
        };
        Returns: Json;
      };
      update_order_item_status_secure: {
        Args: {
          p_order_item_id: string;
          p_new_status: "pending" | "preparing" | "ready" | "cancelled";
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: "owner" | "admin" | "kitchen";
      dietary_type: "veg" | "non-veg" | "vegan" | "egg";
      order_status: "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
      order_item_status: "pending" | "preparing" | "ready" | "cancelled";
      payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
      session_status: "open" | "closed";
    };
  };
}
