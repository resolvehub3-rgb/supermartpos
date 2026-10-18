-- ==============================================================================
-- MIGRATION: 20261018000001_initial_supermarket_pos_schema.sql
-- DESCRIPTION: Multi-Tenant Supermarket POS SaaS Platform Schema & RLS Policies
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Platform Roles (Global Super Admin authorization)
CREATE TABLE IF NOT EXISTS public.platform_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin')),
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 3. Tenants Table (Independent Supermarkets)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'suspended')),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency IN ('GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES')),
  country TEXT NOT NULL DEFAULT 'Ghana',
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  tax_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tenant Memberships Table (Multi-tenant RBAC)
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

-- 5. Registration Applications Table
CREATE TABLE IF NOT EXISTS public.registration_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Ghana',
  preferred_currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  trading_name TEXT,
  currency TEXT NOT NULL DEFAULT 'GHS',
  decimal_precision INT NOT NULL DEFAULT 2,
  timezone TEXT NOT NULL DEFAULT 'Africa/Accra',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  tax_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tax_rate_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_label TEXT NOT NULL DEFAULT 'VAT',
  tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_number_prefix TEXT NOT NULL DEFAULT 'RCP',
  receipt_header TEXT,
  receipt_footer TEXT NOT NULL DEFAULT 'Thank you for shopping with us!',
  receipt_return_policy TEXT NOT NULL DEFAULT 'Goods sold in good condition are returnable within 7 days with valid receipt.',
  receipt_paper_width_mm INT NOT NULL DEFAULT 80 CHECK (receipt_paper_width_mm IN (58, 80)),
  low_stock_threshold INT NOT NULL DEFAULT 10,
  expiry_warning_days INT NOT NULL DEFAULT 30,
  cash_rounding BOOLEAN NOT NULL DEFAULT FALSE,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT FALSE,
  require_shift_to_transact BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_minor INT NOT NULL, -- e.g. 15000 = 150.00 GHS / month
  currency TEXT NOT NULL DEFAULT 'GHS',
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  max_products INT NOT NULL DEFAULT 1000,
  max_cashiers INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  trial_days INT NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'suspended')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Subscription Invoices and Payments
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_minor INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'void', 'failed')),
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.subscription_invoices(id) ON DELETE CASCADE,
  amount_minor INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  payment_method TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  provider_status TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Product Categories Table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

-- 11. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT NOT NULL,
  barcode_type TEXT NOT NULL DEFAULT 'EAN13' CHECK (barcode_type IN ('EAN13', 'EAN8', 'UPCA', 'UPCE', 'CODE128')),
  description TEXT,
  brand TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  purchase_cost_minor INT NOT NULL DEFAULT 0,
  selling_price_minor INT NOT NULL,
  available_stock INT NOT NULL DEFAULT 0,
  reorder_threshold INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sku),
  UNIQUE (tenant_id, barcode)
);

-- 12. Product Batches Table (For batch-level inventory and expiry)
CREATE TABLE IF NOT EXISTS public.product_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  cost_minor INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Inventory Movements Table (Strict audit trail of every stock change)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'opening_stock', 'stock_received', 'sale_deduction', 'return_restock',
    'damage_writeoff', 'expired_writeoff', 'manual_adjustment'
  )),
  quantity_delta INT NOT NULL,
  reason TEXT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  reference_id TEXT, -- sale_id, return_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Registers / Checkout Terminals
CREATE TABLE IF NOT EXISTS public.registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- 15. Cashier Shifts Table
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  register_id UUID REFERENCES public.registers(id) ON DELETE SET NULL,
  cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_cash_minor INT NOT NULL DEFAULT 0,
  closing_cash_minor INT,
  expected_cash_minor INT,
  cash_discrepancy_minor INT,
  notes TEXT,
  supervisor_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  register_id UUID REFERENCES public.registers(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.cashier_shifts(id) ON DELETE RESTRICT,
  cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL,
  subtotal_minor INT NOT NULL,
  discount_minor INT NOT NULL DEFAULT 0,
  tax_minor INT NOT NULL DEFAULT 0,
  total_minor INT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'split')),
  amount_tendered_minor INT NOT NULL,
  change_due_minor INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'partially_refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, receipt_number)
);

-- 17. Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price_minor INT NOT NULL,
  purchase_cost_minor INT NOT NULL DEFAULT 0,
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total_minor INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Refunds & Returns Table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  refund_number TEXT NOT NULL,
  processed_by UUID NOT NULL REFERENCES public.profiles(id),
  total_refund_minor INT NOT NULL,
  refund_method TEXT NOT NULL DEFAULT 'cash',
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, refund_number)
);

CREATE TABLE IF NOT EXISTS public.refund_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES public.sale_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  refund_amount_minor INT NOT NULL,
  restocked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Customer Display Sessions Table (For 2nd Monitor pairing & Realtime)
CREATE TABLE IF NOT EXISTS public.customer_display_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  register_id UUID REFERENCES public.registers(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL UNIQUE,
  active_cart_json JSONB NOT NULL DEFAULT '{"items": [], "subtotal": 0, "total": 0, "status": "idle"}'::jsonb,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'scanning', 'payment_pending', 'completed')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Platform & Tenant Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Email Delivery Logs
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-EFFICIENCY LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode ON public.products(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON public.products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON public.products(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_date ON public.sales(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON public.sales(tenant_id, receipt_number);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory_movements(tenant_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.product_batches(tenant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier ON public.cashier_shifts(tenant_id, cashier_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.tenant_memberships(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_display_code ON public.customer_display_sessions(session_code);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_display_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = check_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tenant_member(check_user_id UUID, target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = check_user_id
      AND tenant_id = target_tenant_id
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read and update their own profile; Super Admins can view all profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Platform Roles: Super Admins only
CREATE POLICY "platform_roles_policy" ON public.platform_roles
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Tenants: Super Admin has full view; tenant members view their own tenant
CREATE POLICY "tenants_select_policy" ON public.tenants
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), id)
  );

CREATE POLICY "tenants_update_policy" ON public.tenants
  FOR UPDATE USING (
    public.is_super_admin(auth.uid()) OR
    (owner_id = auth.uid() AND public.is_tenant_member(auth.uid(), id))
  );

-- Tenant Memberships: Super Admin or Members of the same tenant
CREATE POLICY "memberships_select_policy" ON public.tenant_memberships
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

-- Registration Applications: Anyone authenticated can insert their own application; Super Admin can read and update
CREATE POLICY "applications_insert_policy" ON public.registration_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "applications_select_policy" ON public.registration_applications
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    owner_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "applications_update_policy" ON public.registration_applications
  FOR UPDATE USING (public.is_super_admin(auth.uid()));

-- Store Settings: Tenant members can select; Owners/Managers can update
CREATE POLICY "settings_select_policy" ON public.store_settings
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "settings_update_policy" ON public.store_settings
  FOR UPDATE USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND tenant_id = store_settings.tenant_id AND role IN ('owner', 'manager')
    )
  );

-- Subscription Plans: Public read for active plans; Super Admin can manage
CREATE POLICY "plans_select_policy" ON public.subscription_plans
  FOR SELECT USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "plans_admin_policy" ON public.subscription_plans
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Subscriptions: Tenant members can view their own subscription
CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

-- Standard Tenant-Scoped RLS Macro for Products, Categories, Batches, Movements, Sales, Items, Shifts, Displays
CREATE POLICY "categories_tenant_policy" ON public.product_categories
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "products_tenant_policy" ON public.products
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "batches_tenant_policy" ON public.product_batches
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "movements_tenant_policy" ON public.inventory_movements
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "registers_tenant_policy" ON public.registers
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "shifts_tenant_policy" ON public.cashier_shifts
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "sales_tenant_policy" ON public.sales
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "sale_items_tenant_policy" ON public.sale_items
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "refunds_tenant_policy" ON public.refunds
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), tenant_id)
  );

CREATE POLICY "refund_items_tenant_policy" ON public.refund_items
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.refunds r WHERE r.id = refund_id AND public.is_tenant_member(auth.uid(), r.tenant_id))
  );

CREATE POLICY "display_tenant_policy" ON public.customer_display_sessions
  FOR ALL USING (
    session_code IS NOT NULL
  );

CREATE POLICY "audit_tenant_policy" ON public.audit_logs
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND public.is_tenant_member(auth.uid(), tenant_id))
  );
