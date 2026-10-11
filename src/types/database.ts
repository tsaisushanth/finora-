
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "bill_items": {
                  Row: {
                    "amount": number | null,"bill_id": string,"created_at": string,"description": string | null,"id": string,"quantity": number | null,"suggested_category": string | null,"unit_price": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"bill_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"quantity"?: number | null,"suggested_category"?: string | null,"unit_price"?: number | null,"user_id": string
                  }
                  Update: {
                    "amount"?: number | null,"bill_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"quantity"?: number | null,"suggested_category"?: string | null,"unit_price"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bill_items_bill_id_fkey"
      columns: ["bill_id"]
isOneToOne: false
      referencedRelation: "bills"
      referencedColumns: ["id"]
    }
                  ]
                },"bills": {
                  Row: {
                    "confidence": Json | null,"created_at": string,"document_type": string | null,"error_message": string | null,"expense_id": string | null,"extraction": Json | null,"id": string,"is_a_bill": boolean | null,"mime_type": string | null,"model": string | null,"original_filename": string | null,"provider": string | null,"sanity_flags": Json | null,"size_bytes": number | null,"status": string,"storage_path": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confidence"?: Json | null,"created_at"?: string,"document_type"?: string | null,"error_message"?: string | null,"expense_id"?: string | null,"extraction"?: Json | null,"id"?: string,"is_a_bill"?: boolean | null,"mime_type"?: string | null,"model"?: string | null,"original_filename"?: string | null,"provider"?: string | null,"sanity_flags"?: Json | null,"size_bytes"?: number | null,"status"?: string,"storage_path": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "confidence"?: Json | null,"created_at"?: string,"document_type"?: string | null,"error_message"?: string | null,"expense_id"?: string | null,"extraction"?: Json | null,"id"?: string,"is_a_bill"?: boolean | null,"mime_type"?: string | null,"model"?: string | null,"original_filename"?: string | null,"provider"?: string | null,"sanity_flags"?: Json | null,"size_bytes"?: number | null,"status"?: string,"storage_path"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bills_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "expenses"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "archived_at": string | null,"color": string,"created_at": string,"icon": string,"id": string,"is_default": boolean,"kind": string,"name": string,"sort_order": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_default"?: boolean,"kind": string,"name": string,"sort_order"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_default"?: boolean,"kind"?: string,"name"?: string,"sort_order"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"expenses": {
                  Row: {
                    "amount": number,"bill_id": string | null,"category_id": string | null,"created_at": string,"id": string,"merchant": string | null,"note": string | null,"occurred_at": string,"payment_method_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"bill_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"id"?: string,"merchant"?: string | null,"note"?: string | null,"occurred_at"?: string,"payment_method_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"bill_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"id"?: string,"merchant"?: string | null,"note"?: string | null,"occurred_at"?: string,"payment_method_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_bill_fk"
      columns: ["bill_id"]
isOneToOne: false
      referencedRelation: "bills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_payment_method_id_fkey"
      columns: ["payment_method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["id"]
    }
                  ]
                },"goal_contributions": {
                  Row: {
                    "amount": number,"created_at": string,"goal_id": string,"id": string,"kind": string,"note": string | null,"occurred_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"goal_id": string,"id"?: string,"kind"?: string,"note"?: string | null,"occurred_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"goal_id"?: string,"id"?: string,"kind"?: string,"note"?: string | null,"occurred_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goal_contributions_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "goal_progress"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goal_contributions_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "category_id": string | null,"created_at": string,"description": string | null,"id": string,"name": string,"priority": string,"status": string,"target_amount": number,"target_date": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"priority"?: string,"status"?: string,"target_amount": number,"target_date"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"priority"?: string,"status"?: string,"target_amount"?: number,"target_date"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goals_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"income_entries": {
                  Row: {
                    "amount": number,"category_id": string | null,"created_at": string,"id": string,"note": string | null,"occurred_at": string,"source": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"source"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"category_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"source"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "income_entries_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"loan_repayments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"loan_id": string,"note": string | null,"occurred_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"loan_id": string,"note"?: string | null,"occurred_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"loan_id"?: string,"note"?: string | null,"occurred_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loan_repayments_loan_id_fkey"
      columns: ["loan_id"]
isOneToOne: false
      referencedRelation: "loans"
      referencedColumns: ["id"]
    }
                  ]
                },"loans": {
                  Row: {
                    "created_at": string,"direction": string,"due_date": string | null,"id": string,"note": string | null,"occurred_at": string,"person": string,"principal": number,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"direction": string,"due_date"?: string | null,"id"?: string,"note"?: string | null,"occurred_at"?: string,"person": string,"principal": number,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"direction"?: string,"due_date"?: string | null,"id"?: string,"note"?: string | null,"occurred_at"?: string,"person"?: string,"principal"?: number,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payment_methods": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"id": string,"is_default": boolean,"name": string,"type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"is_default"?: boolean,"name": string,"type"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"is_default"?: boolean,"name"?: string,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"city": string | null,"created_at": string,"currency": string,"date_of_birth": string | null,"full_name": string | null,"id": string,"locale": string,"monthly_budget": number,"monthly_income": number,"notify_bill_reminders": boolean,"notify_budget_alerts": boolean,"notify_email": boolean,"notify_push": boolean,"occupation": string | null,"onboarding_completed_at": string | null,"phone": string | null,"savings_target_percent": number,"theme": string,"timezone": string,"updated_at": string,"username": string | null,"week_start_day": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"city"?: string | null,"created_at"?: string,"currency"?: string,"date_of_birth"?: string | null,"full_name"?: string | null,"id": string,"locale"?: string,"monthly_budget"?: number,"monthly_income"?: number,"notify_bill_reminders"?: boolean,"notify_budget_alerts"?: boolean,"notify_email"?: boolean,"notify_push"?: boolean,"occupation"?: string | null,"onboarding_completed_at"?: string | null,"phone"?: string | null,"savings_target_percent"?: number,"theme"?: string,"timezone"?: string,"updated_at"?: string,"username"?: string | null,"week_start_day"?: number
                  }
                  Update: {
                    "avatar_url"?: string | null,"city"?: string | null,"created_at"?: string,"currency"?: string,"date_of_birth"?: string | null,"full_name"?: string | null,"id"?: string,"locale"?: string,"monthly_budget"?: number,"monthly_income"?: number,"notify_bill_reminders"?: boolean,"notify_budget_alerts"?: boolean,"notify_email"?: boolean,"notify_push"?: boolean,"occupation"?: string | null,"onboarding_completed_at"?: string | null,"phone"?: string | null,"savings_target_percent"?: number,"theme"?: string,"timezone"?: string,"updated_at"?: string,"username"?: string | null,"week_start_day"?: number
                  }
                  Relationships: [
                    
                  ]
                },"wallet_entries": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"note": string | null,"occurred_at": string,"ref_id": string | null,"ref_type": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"ref_id"?: string | null,"ref_type"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"ref_id"?: string | null,"ref_type"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "goal_progress": {
                  Row: {
                    "id": string | null,"saved_amount": number | null,"target_amount": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"wallet_balances": {
                  Row: {
                    "balance": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "add_income":
{ Args: { "p_amount": number,"p_category_id"?: string,"p_note"?: string,"p_occurred_at"?: string,"p_source"?: string }; Returns: string
                           },
"adjust_balance":
{ Args: { "p_amount_delta": number,"p_reason": string }; Returns: undefined
                           },
"confirm_bill":
{ Args: { "p_bill_id": string,"p_payload": Json }; Returns: string
                           },
"contribute_to_goal":
{ Args: { "p_amount": number,"p_goal_id": string,"p_note"?: string,"p_occurred_at"?: string }; Returns: undefined
                           },
"create_expense":
{ Args: { "p_amount": number,"p_bill_id"?: string,"p_category_id"?: string,"p_merchant"?: string,"p_note"?: string,"p_occurred_at"?: string,"p_payment_method_id"?: string }; Returns: string
                           },
"create_goal":
{ Args: { "p_category_id"?: string,"p_description"?: string,"p_name": string,"p_priority"?: string,"p_target_amount": number,"p_target_date"?: string }; Returns: string
                           },
"delete_expense":
{ Args: { "p_id": string }; Returns: undefined
                           },
"delete_goal":
{ Args: { "p_goal_id": string }; Returns: undefined
                           },
"delete_income":
{ Args: { "p_id": string }; Returns: undefined
                           },
"record_loan":
{ Args: { "p_direction": string,"p_due_date"?: string,"p_note"?: string,"p_occurred_at"?: string,"p_person": string,"p_principal": number }; Returns: string
                           },
"repay_loan":
{ Args: { "p_amount": number,"p_loan_id": string,"p_note"?: string,"p_occurred_at"?: string }; Returns: undefined
                           },
"set_opening_balance":
{ Args: { "p_amount": number }; Returns: undefined
                           },
"update_expense":
{ Args: { "p_amount": number,"p_category_id"?: string,"p_id": string,"p_merchant"?: string,"p_note"?: string,"p_occurred_at"?: string,"p_payment_method_id"?: string }; Returns: undefined
                           },
"update_goal":
{ Args: { "p_category_id"?: string,"p_description"?: string,"p_id": string,"p_name": string,"p_priority"?: string,"p_status"?: string,"p_target_amount": number,"p_target_date"?: string }; Returns: undefined
                           },
"wallet_balance":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"withdraw_from_goal":
{ Args: { "p_amount": number,"p_goal_id": string,"p_note"?: string,"p_occurred_at"?: string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
