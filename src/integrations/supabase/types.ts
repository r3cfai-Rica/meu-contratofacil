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
      clients: {
        Row: {
          address: string | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_history: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          clauses: string | null
          client_id: string
          contract_number: string
          created_at: string
          end_date: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          public_token: string | null
          service_description: string | null
          service_type: string
          signature_data: string | null
          signature_type: string | null
          signed_at: string | null
          signer_birth_date: string | null
          signer_display_name: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_name: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          clauses?: string | null
          client_id: string
          contract_number?: string
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          public_token?: string | null
          service_description?: string | null
          service_type: string
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signer_birth_date?: string | null
          signer_display_name?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          total_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          clauses?: string | null
          client_id?: string
          contract_number?: string
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          public_token?: string | null
          service_description?: string | null
          service_type?: string
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signer_birth_date?: string | null
          signer_display_name?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminders: {
        Row: {
          id: string
          invoice_id: string
          recipient_email: string | null
          reminder_type: string
          sent_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          recipient_email?: string | null
          reminder_type: string
          sent_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          recipient_email?: string | null
          reminder_type?: string
          sent_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          contract_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          installment_number: number | null
          installment_total: number | null
          is_recurring: boolean
          paid_at: string | null
          payment_notes: string | null
          public_token: string | null
          recurrence_group: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id: string
          contract_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          paid_at?: string | null
          payment_notes?: string | null
          public_token?: string | null
          recurrence_group?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          contract_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          paid_at?: string | null
          payment_notes?: string | null
          public_token?: string | null
          recurrence_group?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pix_settings: {
        Row: {
          beneficiary_name: string
          city: string
          created_at: string
          id: string
          key_type: Database["public"]["Enums"]["pix_key_type"]
          pix_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiary_name: string
          city: string
          created_at?: string
          id?: string
          key_type: Database["public"]["Enums"]["pix_key_type"]
          pix_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficiary_name?: string
          city?: string
          created_at?: string
          id?: string
          key_type?: Database["public"]["Enums"]["pix_key_type"]
          pix_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          full_name: string
          id: string
          logo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name: string
          id?: string
          logo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invite_token: string
          invited_at: string
          member_user_id: string | null
          owner_id: string
          status: Database["public"]["Enums"]["team_invite_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invite_token?: string
          invited_at?: string
          member_user_id?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["team_invite_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invite_token?: string
          invited_at?: string
          member_user_id?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["team_invite_status"]
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      count_team_members: { Args: { _owner_id: string }; Returns: number }
      count_user_active_contracts: {
        Args: { _user_id: string }
        Returns: number
      }
      count_user_clients: { Args: { _user_id: string }; Returns: number }
      count_user_invoices_this_month: {
        Args: { _user_id: string }
        Returns: number
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      list_admin_users: {
        Args: never
        Returns: {
          account_type: Database["public"]["Enums"]["account_type"]
          clients_count: number
          contracts_count: number
          current_period_end: string
          email: string
          full_name: string
          invoices_count: number
          is_admin: boolean
          plan: Database["public"]["Enums"]["plan_tier"]
          signed_up_at: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }[]
      }
      user_workspace_owners: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      account_type: "mei" | "autonomo" | "prestador" | "liberal"
      app_role: "admin" | "user"
      client_status: "active" | "inactive"
      contract_status:
        | "draft"
        | "sent"
        | "awaiting_signature"
        | "signed"
        | "cancelled"
      invoice_status: "pending" | "paid" | "overdue" | "cancelled"
      payment_method: "one_time" | "installments" | "recurring"
      pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random"
      plan_tier: "free" | "pro" | "business"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
      team_invite_status: "pending" | "accepted" | "revoked"
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
      account_type: ["mei", "autonomo", "prestador", "liberal"],
      app_role: ["admin", "user"],
      client_status: ["active", "inactive"],
      contract_status: [
        "draft",
        "sent",
        "awaiting_signature",
        "signed",
        "cancelled",
      ],
      invoice_status: ["pending", "paid", "overdue", "cancelled"],
      payment_method: ["one_time", "installments", "recurring"],
      pix_key_type: ["cpf", "cnpj", "email", "phone", "random"],
      plan_tier: ["free", "pro", "business"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
      ],
      team_invite_status: ["pending", "accepted", "revoked"],
    },
  },
} as const
