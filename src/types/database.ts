/**
 * Complete Database and Domain Types for Afrimart Supermarket POS SaaS
 */

export type PlatformRoleType = 'super_admin';
export type TenantRoleType = 'owner' | 'manager' | 'cashier';
export type TenantStatus = 'pending_approval' | 'approved' | 'rejected' | 'suspended';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type BarcodeType = 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' | 'CODE128';
export type ShiftStatus = 'open' | 'closed';
export type SaleStatus = 'completed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'split';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'suspended';
export type InvoiceStatus = 'unpaid' | 'paid' | 'void' | 'failed';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformRole {
  id: string;
  user_id: string;
  role: PlatformRoleType;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  owner_id: string;
  currency: string;
  country: string;
  address: string;
  phone: string;
  email: string;
  tax_id?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRoleType;
  is_active: boolean;
  created_at: string;
  user?: UserProfile;
}

export interface RegistrationApplication {
  id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  phone: string;
  address: string;
  country: string;
  preferred_currency: string;
  status: ApplicationStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  decision_notes?: string | null;
  created_tenant_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  tenant_id: string;
  trading_name?: string | null;
  currency: string;
  decimal_precision: number;
  timezone: string;
  date_format: string;
  tax_enabled: boolean;
  tax_rate_percentage: number;
  tax_label: string;
  tax_inclusive: boolean;
  receipt_number_prefix: string;
  receipt_header?: string | null;
  receipt_footer: string;
  receipt_return_policy: string;
  receipt_paper_width_mm: 58 | 80;
  low_stock_threshold: number;
  expiry_warning_days: number;
  cash_rounding: boolean;
  allow_negative_stock: boolean;
  require_shift_to_transact: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  billing_interval: 'monthly' | 'yearly';
  max_products: number;
  max_cashiers: number;
  is_active: boolean;
  trial_days: number;
  created_at: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan?: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  name: string;
  sku: string;
  barcode: string;
  barcode_type: BarcodeType;
  description?: string | null;
  brand?: string | null;
  unit_of_measure: string;
  purchase_cost_minor: number;
  selling_price_minor: number;
  available_stock: number;
  reorder_threshold: number;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
  batches?: ProductBatch[];
}

export interface ProductBatch {
  id: string;
  tenant_id: string;
  product_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string; // YYYY-MM-DD
  cost_minor: number;
  is_active: boolean;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  batch_id?: string | null;
  movement_type:
    | 'opening_stock'
    | 'stock_received'
    | 'sale_deduction'
    | 'return_restock'
    | 'damage_writeoff'
    | 'expired_writeoff'
    | 'manual_adjustment';
  quantity_delta: number;
  reason: string;
  previous_stock: number;
  new_stock: number;
  user_id?: string | null;
  reference_id?: string | null;
  created_at: string;
  product_name?: string;
}

export interface Register {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface CashierShift {
  id: string;
  tenant_id: string;
  register_id?: string | null;
  cashier_id: string;
  status: ShiftStatus;
  opened_at: string;
  closed_at?: string | null;
  opening_cash_minor: number;
  closing_cash_minor?: number | null;
  expected_cash_minor?: number | null;
  cash_discrepancy_minor?: number | null;
  notes?: string | null;
  supervisor_reviewed: boolean;
  created_at: string;
  cashier?: UserProfile;
}

export interface Sale {
  id: string;
  tenant_id: string;
  register_id?: string | null;
  shift_id?: string | null;
  cashier_id: string;
  receipt_number: string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  payment_method: PaymentMethod;
  amount_tendered_minor: number;
  change_due_minor: number;
  status: SaleStatus;
  notes?: string | null;
  created_at: string;
  cashier?: UserProfile;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  tenant_id: string;
  product_id: string;
  batch_id?: string | null;
  product_name: string;
  unit_price_minor: number;
  purchase_cost_minor: number;
  quantity: number;
  line_total_minor: number;
  created_at: string;
}

export interface Refund {
  id: string;
  tenant_id: string;
  sale_id: string;
  refund_number: string;
  processed_by: string;
  total_refund_minor: number;
  refund_method: string;
  reason: string;
  created_at: string;
  items?: RefundItem[];
}

export interface RefundItem {
  id: string;
  refund_id: string;
  sale_item_id: string;
  product_id: string;
  quantity: number;
  refund_amount_minor: number;
  restocked: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details_json?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
  user_name?: string;
}
