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
      activities: {
        Row: {
          agency_id: string
          body: string | null
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          occurred_at: string
          subject: string | null
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          agency_id: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          occurred_at?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          agency_id?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          occurred_at?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          sector_tags: string[]
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          sector_tags?: string[]
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          sector_tags?: string[]
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          agency_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["contact_role"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["contact_role"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["contact_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          agency_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          hot_terms: string | null
          id: string
          listing_id: string | null
          notes: string | null
          requirement_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          agency_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          hot_terms?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          requirement_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          agency_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          hot_terms?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          requirement_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agency_id: string
          barrelage: number | null
          capacity: number | null
          company_id: string | null
          covers_external: number | null
          covers_internal: number | null
          created_at: string
          created_by: string | null
          description: string | null
          epc_rating: string | null
          fixtures_fittings: number | null
          frontage_ft: number | null
          gas: boolean
          goodwill: number | null
          id: string
          kitchen_extraction: boolean
          lat: number | null
          licence: Database["public"]["Enums"]["licence_status"]
          licence_hours: string | null
          lng: number | null
          postcode: string | null
          premium: number | null
          rateable_value: number | null
          region: string | null
          rent: number | null
          service_charge: number | null
          size_sqft: number | null
          size_sqm: number | null
          status: Database["public"]["Enums"]["listing_status"]
          tenure: Database["public"]["Enums"]["tenure_type"]
          three_phase_power: boolean
          tied: boolean
          title: string
          town: string | null
          turnover: number | null
          updated_at: string
          use_class: Database["public"]["Enums"]["use_class"]
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id: string
          barrelage?: number | null
          capacity?: number | null
          company_id?: string | null
          covers_external?: number | null
          covers_internal?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          epc_rating?: string | null
          fixtures_fittings?: number | null
          frontage_ft?: number | null
          gas?: boolean
          goodwill?: number | null
          id?: string
          kitchen_extraction?: boolean
          lat?: number | null
          licence?: Database["public"]["Enums"]["licence_status"]
          licence_hours?: string | null
          lng?: number | null
          postcode?: string | null
          premium?: number | null
          rateable_value?: number | null
          region?: string | null
          rent?: number | null
          service_charge?: number | null
          size_sqft?: number | null
          size_sqm?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          tenure?: Database["public"]["Enums"]["tenure_type"]
          three_phase_power?: boolean
          tied?: boolean
          title: string
          town?: string | null
          turnover?: number | null
          updated_at?: string
          use_class?: Database["public"]["Enums"]["use_class"]
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id?: string
          barrelage?: number | null
          capacity?: number | null
          company_id?: string | null
          covers_external?: number | null
          covers_internal?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          epc_rating?: string | null
          fixtures_fittings?: number | null
          frontage_ft?: number | null
          gas?: boolean
          goodwill?: number | null
          id?: string
          kitchen_extraction?: boolean
          lat?: number | null
          licence?: Database["public"]["Enums"]["licence_status"]
          licence_hours?: string | null
          lng?: number | null
          postcode?: string | null
          premium?: number | null
          rateable_value?: number | null
          region?: string | null
          rent?: number | null
          service_charge?: number | null
          size_sqft?: number | null
          size_sqm?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          tenure?: Database["public"]["Enums"]["tenure_type"]
          three_phase_power?: boolean
          tied?: boolean
          title?: string
          town?: string | null
          turnover?: number | null
          updated_at?: string
          use_class?: Database["public"]["Enums"]["use_class"]
        }
        Relationships: [
          {
            foreignKeyName: "listings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          listing_id: string
          reasons: Json
          requirement_id: string
          score: number
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          listing_id: string
          reasons?: Json
          requirement_id: string
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          reasons?: Json
          requirement_id?: string
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          agency_id: string
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          max_covers: number | null
          max_premium: number | null
          max_rent: number | null
          max_sqft: number | null
          min_covers: number | null
          min_sqft: number | null
          notes: string | null
          status: Database["public"]["Enums"]["requirement_status"]
          target_regions: string[]
          target_towns: string[]
          tenure_prefs: Database["public"]["Enums"]["tenure_type"][]
          title: string
          updated_at: string
          use_classes: Database["public"]["Enums"]["use_class"][]
        }
        Insert: {
          agency_id: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_covers?: number | null
          max_premium?: number | null
          max_rent?: number | null
          max_sqft?: number | null
          min_covers?: number | null
          min_sqft?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["requirement_status"]
          target_regions?: string[]
          target_towns?: string[]
          tenure_prefs?: Database["public"]["Enums"]["tenure_type"][]
          title: string
          updated_at?: string
          use_classes?: Database["public"]["Enums"]["use_class"][]
        }
        Update: {
          agency_id?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_covers?: number | null
          max_premium?: number | null
          max_rent?: number | null
          max_sqft?: number | null
          min_covers?: number | null
          min_sqft?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["requirement_status"]
          target_regions?: string[]
          target_towns?: string[]
          tenure_prefs?: Database["public"]["Enums"]["tenure_type"][]
          title?: string
          updated_at?: string
          use_classes?: Database["public"]["Enums"]["use_class"][]
        }
        Relationships: [
          {
            foreignKeyName: "requirements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_agency_ids: { Args: never; Returns: string[] }
      is_agency_admin: { Args: { p_agency_id: string }; Returns: boolean }
      seed_agency: {
        Args: { p_agency_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_type: "call" | "email" | "viewing" | "note" | "meeting" | "task"
      company_type: "operator" | "landlord" | "agent" | "vendor" | "other"
      contact_role:
        | "acquisitions"
        | "landlord"
        | "solicitor"
        | "agent"
        | "finance"
        | "other"
      deal_stage:
        | "lead"
        | "viewing"
        | "offer"
        | "heads_of_terms"
        | "legal"
        | "completed"
        | "fell_through"
      entity_type: "company" | "contact" | "listing" | "requirement" | "deal"
      licence_status: "held" | "late" | "none"
      listing_status: "available" | "under_offer" | "let" | "sold" | "withdrawn"
      match_status: "suggested" | "shortlisted" | "rejected" | "converted"
      member_role: "admin" | "agent"
      requirement_status: "active" | "on_hold" | "satisfied" | "withdrawn"
      tenure_type: "freehold" | "leasehold" | "assignment" | "new_letting"
      use_class:
        | "E"
        | "sui_generis_pub_bar"
        | "sui_generis_nightclub"
        | "sui_generis_hot_food"
        | "A3"
        | "A4"
        | "A5"
        | "other"
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
      activity_type: ["call", "email", "viewing", "note", "meeting", "task"],
      company_type: ["operator", "landlord", "agent", "vendor", "other"],
      contact_role: [
        "acquisitions",
        "landlord",
        "solicitor",
        "agent",
        "finance",
        "other",
      ],
      deal_stage: [
        "lead",
        "viewing",
        "offer",
        "heads_of_terms",
        "legal",
        "completed",
        "fell_through",
      ],
      entity_type: ["company", "contact", "listing", "requirement", "deal"],
      licence_status: ["held", "late", "none"],
      listing_status: ["available", "under_offer", "let", "sold", "withdrawn"],
      match_status: ["suggested", "shortlisted", "rejected", "converted"],
      member_role: ["admin", "agent"],
      requirement_status: ["active", "on_hold", "satisfied", "withdrawn"],
      tenure_type: ["freehold", "leasehold", "assignment", "new_letting"],
      use_class: [
        "E",
        "sui_generis_pub_bar",
        "sui_generis_nightclub",
        "sui_generis_hot_food",
        "A3",
        "A4",
        "A5",
        "other",
      ],
    },
  },
} as const
