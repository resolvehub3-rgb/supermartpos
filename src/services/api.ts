import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Tenant,
  RegistrationApplication,
  StoreSettings,
  SubscriptionPlan,
  ProductCategory,
  Product,
  InventoryMovement,
  CashierShift,
  Sale,
  Refund,
  AuditLog,
} from '../types/database';

export const api = {
  // --------------------------------------------------------------------------
  // PLATFORM & SUPER ADMIN OPERATIONS
  // --------------------------------------------------------------------------

  async getPlatformStats() {
    if (!isSupabaseConfigured || !supabase) {
      return {
        totalSupermarkets: 0,
        pendingApplications: 0,
        approvedSupermarkets: 0,
        suspendedSupermarkets: 0,
        activeSubscriptions: 0,
        confirmedRevenueMinor: 0,
      };
    }

    const [tenantsRes, appsRes, subsRes, paymentsRes] = await Promise.all([
      supabase.from('tenants').select('status'),
      supabase.from('registration_applications').select('status').eq('status', 'pending'),
      supabase.from('subscriptions').select('status').eq('status', 'active'),
      supabase.from('subscription_payments').select('amount_minor'),
    ]);

    const tenants = tenantsRes.data || [];
    const totalSupermarkets = tenants.length;
    const approvedSupermarkets = tenants.filter(t => t.status === 'approved').length;
    const suspendedSupermarkets = tenants.filter(t => t.status === 'suspended').length;
    const pendingApplications = (appsRes.data || []).length;
    const activeSubscriptions = (subsRes.data || []).length;
    const confirmedRevenueMinor = (paymentsRes.data || []).reduce((acc, p) => acc + (p.amount_minor || 0), 0);

    return {
      totalSupermarkets,
      pendingApplications,
      approvedSupermarkets,
      suspendedSupermarkets,
      activeSubscriptions,
      confirmedRevenueMinor,
    };
  },

  async getRegistrationApplications(): Promise<RegistrationApplication[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('registration_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async submitRegistrationApplication(application: Omit<RegistrationApplication, 'id' | 'status' | 'created_at' | 'updated_at'>) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
    }
    const { data, error } = await supabase
      .from('registration_applications')
      .insert([{
        ...application,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reviewApplication(
    applicationId: string,
    decision: 'approved' | 'rejected',
    decisionNotes: string,
    reviewerId: string
  ) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { data: app, error: appFetchErr } = await supabase
      .from('registration_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appFetchErr || !app) throw appFetchErr || new Error('Application not found');

    let createdTenantId: string | null = null;

    if (decision === 'approved') {
      const slug = app.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
      
      // 1. Create Tenant
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert([{
          name: app.business_name,
          slug,
          status: 'approved',
          owner_id: reviewerId, // owner profile ID
          currency: app.preferred_currency || 'GHS',
          country: app.country || 'Ghana',
          address: app.address,
          phone: app.phone,
          email: app.owner_email,
        }])
        .select()
        .single();

      if (tenantErr) throw tenantErr;
      createdTenantId = tenant.id;

      // 2. Initialize default Store Settings
      await supabase.from('store_settings').insert([{
        tenant_id: tenant.id,
        trading_name: app.business_name,
        currency: app.preferred_currency || 'GHS',
        tax_enabled: false,
        onboarding_completed: false,
      }]);

      // 3. Grant owner membership
      await supabase.from('tenant_memberships').insert([{
        tenant_id: tenant.id,
        user_id: reviewerId,
        role: 'owner',
        is_active: true,
      }]);
    }

    // Update application
    const { data: updatedApp, error: updateErr } = await supabase
      .from('registration_applications')
      .update({
        status: decision,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        decision_notes: decisionNotes,
        created_tenant_id: createdTenantId,
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Record audit log
    await this.recordAuditLog({
      action: `application_${decision}`,
      entity_type: 'registration_application',
      entity_id: applicationId,
      details_json: { decision, decisionNotes, createdTenantId },
      user_id: reviewerId,
    });

    return updatedApp;
  },

  async getTenants(): Promise<Tenant[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateTenantStatus(tenantId: string, status: 'approved' | 'suspended', adminId: string) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('tenants')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select()
      .single();
    if (error) throw error;

    await this.recordAuditLog({
      tenant_id: tenantId,
      action: `tenant_${status}`,
      entity_type: 'tenant',
      entity_id: tenantId,
      details_json: { new_status: status },
      user_id: adminId,
    });

    return data;
  },

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_minor', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'created_at'>) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([plan])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPlatformAuditLogs(): Promise<AuditLog[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  },

  async recordAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>) {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from('audit_logs').insert([log]);
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  },

  // --------------------------------------------------------------------------
  // SHOP OWNER DASHBOARD & INVENTORY OPERATIONS
  // --------------------------------------------------------------------------

  async getShopDashboardStats(tenantId: string) {
    if (!isSupabaseConfigured || !supabase) {
      return {
        todaySalesMinor: 0,
        todayTransactionsCount: 0,
        lowStockCount: 0,
        expiringBatchesCount: 0,
        expiredBatchesCount: 0,
        activeCashiersCount: 0,
        openShiftsCount: 0,
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [salesRes, productsRes, shiftsRes] = await Promise.all([
      supabase
        .from('sales')
        .select('total_minor, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('products')
        .select('available_stock, reorder_threshold')
        .eq('tenant_id', tenantId),
      supabase
        .from('cashier_shifts')
        .select('cashier_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'open'),
    ]);

    const sales = salesRes.data || [];
    const todaySalesMinor = sales.reduce((acc, s) => acc + (s.total_minor || 0), 0);
    const todayTransactionsCount = sales.length;

    const products = productsRes.data || [];
    const lowStockCount = products.filter(p => p.available_stock <= p.reorder_threshold).length;

    const openShifts = shiftsRes.data || [];
    const openShiftsCount = openShifts.length;
    const activeCashiersCount = new Set(openShifts.map(s => s.cashier_id)).size;

    return {
      todaySalesMinor,
      todayTransactionsCount,
      lowStockCount,
      expiringBatchesCount: 0,
      expiredBatchesCount: 0,
      activeCashiersCount,
      openShiftsCount,
    };
  },

  async getProducts(tenantId: string, search?: string, categoryId?: string): Promise<Product[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    let query = supabase
      .from('products')
      .select('*, category:product_categories(id, name), batches:product_batches(*)')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createProduct(
    product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category' | 'batches'>,
    initialBatch?: { batch_number: string; expiry_date: string; quantity: number }
  ) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) throw error;

    // If opening stock provided, record movement
    if (product.available_stock > 0) {
      await supabase.from('inventory_movements').insert([{
        tenant_id: product.tenant_id,
        product_id: newProduct.id,
        movement_type: 'opening_stock',
        quantity_delta: product.available_stock,
        previous_stock: 0,
        new_stock: product.available_stock,
        reason: 'Opening stock registration',
      }]);
    }

    // If initial batch with expiry date provided, record batch
    if (initialBatch && initialBatch.expiry_date) {
      await supabase.from('product_batches').insert([{
        tenant_id: product.tenant_id,
        product_id: newProduct.id,
        batch_number: initialBatch.batch_number || 'B-INIT-01',
        quantity: initialBatch.quantity || product.available_stock,
        expiry_date: initialBatch.expiry_date,
        cost_minor: product.purchase_cost_minor,
      }]);
    }

    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCategories(tenantId: string): Promise<ProductCategory[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createCategory(category: Omit<ProductCategory, 'id' | 'created_at'>) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('product_categories')
      .insert([category])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getInventoryMovements(tenantId: string): Promise<InventoryMovement[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, product:products(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      product_name: item.product?.name,
    }));
  },

  async adjustStock(
    tenantId: string,
    productId: string,
    quantityDelta: number,
    movementType: 'manual_adjustment' | 'damage_writeoff' | 'expired_writeoff' | 'stock_received',
    reason: string,
    userId: string
  ) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

    // 1. Get current stock
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('available_stock')
      .eq('id', productId)
      .single();

    if (fetchErr || !product) throw fetchErr || new Error('Product not found');

    const previousStock = product.available_stock;
    const newStock = previousStock + quantityDelta;

    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current stock is ${previousStock}, adjustment would result in ${newStock}.`);
    }

    // 2. Update stock
    await supabase
      .from('products')
      .update({ available_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);

    // 3. Log movement
    const { data: movement, error: logErr } = await supabase
      .from('inventory_movements')
      .insert([{
        tenant_id: tenantId,
        product_id: productId,
        movement_type: movementType,
        quantity_delta: quantityDelta,
        previous_stock: previousStock,
        new_stock: newStock,
        reason,
        user_id: userId,
      }])
      .select()
      .single();

    if (logErr) throw logErr;
    return movement;
  },

  // --------------------------------------------------------------------------
  // CASHIER & POS OPERATIONS
  // --------------------------------------------------------------------------

  async getActiveShift(tenantId: string, cashierId: string): Promise<CashierShift | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('cashier_shifts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('cashier_id', cashierId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async openShift(tenantId: string, cashierId: string, openingCashMinor: number, registerId?: string) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

    // Check if shift already open
    const active = await this.getActiveShift(tenantId, cashierId);
    if (active) throw new Error('You already have an active open shift on this terminal.');

    const { data, error } = await supabase
      .from('cashier_shifts')
      .insert([{
        tenant_id: tenantId,
        cashier_id: cashierId,
        register_id: registerId || null,
        opening_cash_minor: openingCashMinor,
        status: 'open',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeShift(shiftId: string, closingCashMinor: number, notes?: string) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

    const { data: shift, error: fetchErr } = await supabase
      .from('cashier_shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (fetchErr || !shift) throw fetchErr || new Error('Shift not found');

    // Calculate cash sales completed during this shift
    const { data: sales } = await supabase
      .from('sales')
      .select('total_minor, payment_method')
      .eq('shift_id', shiftId)
      .eq('payment_method', 'cash')
      .eq('status', 'completed');

    const cashSalesMinor = (sales || []).reduce((acc, s) => acc + (s.total_minor || 0), 0);
    const expectedCashMinor = shift.opening_cash_minor + cashSalesMinor;
    const discrepancyMinor = closingCashMinor - expectedCashMinor;

    const { data: closedShift, error: updateErr } = await supabase
      .from('cashier_shifts')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_cash_minor: closingCashMinor,
        expected_cash_minor: expectedCashMinor,
        cash_discrepancy_minor: discrepancyMinor,
        notes: notes || null,
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (updateErr) throw updateErr;
    return closedShift;
  },

  async processSale(saleData: {
    tenantId: string;
    shiftId: string;
    cashierId: string;
    registerId?: string | null;
    items: Array<{
      productId: string;
      productName: string;
      unitPriceMinor: number;
      purchaseCostMinor: number;
      quantity: number;
      lineTotalMinor: number;
    }>;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    paymentMethod: 'cash' | 'card' | 'mobile_money' | 'split';
    amountTenderedMinor: number;
    changeDueMinor: number;
  }): Promise<Sale> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

    // Generate unique receipt number
    const timestamp = Date.now().toString().slice(-6);
    const receiptNumber = `RCP-${timestamp}-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Insert Sale Record
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert([{
        tenant_id: saleData.tenantId,
        shift_id: saleData.shiftId,
        cashier_id: saleData.cashierId,
        register_id: saleData.registerId || null,
        receipt_number: receiptNumber,
        subtotal_minor: saleData.subtotalMinor,
        discount_minor: saleData.discountMinor,
        tax_minor: saleData.taxMinor,
        total_minor: saleData.totalMinor,
        payment_method: saleData.paymentMethod,
        amount_tendered_minor: saleData.amountTenderedMinor,
        change_due_minor: saleData.changeDueMinor,
        status: 'completed',
      }])
      .select()
      .single();

    if (saleErr) throw saleErr;

    // 2. Insert Sale Items & Deduct Stock
    for (const item of saleData.items) {
      await supabase.from('sale_items').insert([{
        sale_id: sale.id,
        tenant_id: saleData.tenantId,
        product_id: item.productId,
        product_name: item.productName,
        unit_price_minor: item.unitPriceMinor,
        purchase_cost_minor: item.purchaseCostMinor,
        quantity: item.quantity,
        line_total_minor: item.lineTotalMinor,
      }]);

      // Deduct available stock
      const { data: currentProduct } = await supabase
        .from('products')
        .select('available_stock')
        .eq('id', item.productId)
        .single();

      if (currentProduct) {
        const prev = currentProduct.available_stock;
        const next = Math.max(0, prev - item.quantity);
        await supabase
          .from('products')
          .update({ available_stock: next })
          .eq('id', item.productId);

        await supabase.from('inventory_movements').insert([{
          tenant_id: saleData.tenantId,
          product_id: item.productId,
          movement_type: 'sale_deduction',
          quantity_delta: -item.quantity,
          previous_stock: prev,
          new_stock: next,
          reason: `Sale ${receiptNumber}`,
          reference_id: sale.id,
          user_id: saleData.cashierId,
        }]);
      }
    }

    return sale;
  },

  async getSales(tenantId: string): Promise<Sale[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('sales')
      .select('*, cashier:profiles(full_name), items:sale_items(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  },

  async processRefund(
    tenantId: string,
    saleId: string,
    itemsToRefund: Array<{ saleItemId: string; productId: string; quantity: number; refundAmountMinor: number; restock: boolean }>,
    reason: string,
    processedBy: string
  ) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

    const totalRefundMinor = itemsToRefund.reduce((acc, i) => acc + i.refundAmountMinor, 0);
    const refundNumber = `REF-${Date.now().toString().slice(-6)}`;

    const { data: refund, error: refundErr } = await supabase
      .from('refunds')
      .insert([{
        tenant_id: tenantId,
        sale_id: saleId,
        refund_number: refundNumber,
        processed_by: processedBy,
        total_refund_minor: totalRefundMinor,
        reason,
      }])
      .select()
      .single();

    if (refundErr) throw refundErr;

    for (const item of itemsToRefund) {
      await supabase.from('refund_items').insert([{
        refund_id: refund.id,
        sale_item_id: item.saleItemId,
        product_id: item.productId,
        quantity: item.quantity,
        refund_amount_minor: item.refundAmountMinor,
        restocked: item.restock,
      }]);

      if (item.restock) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('available_stock')
          .eq('id', item.productId)
          .single();

        if (currentProduct) {
          const prev = currentProduct.available_stock;
          const next = prev + item.quantity;
          await supabase.from('products').update({ available_stock: next }).eq('id', item.productId);
          await supabase.from('inventory_movements').insert([{
            tenant_id: tenantId,
            product_id: item.productId,
            movement_type: 'return_restock',
            quantity_delta: item.quantity,
            previous_stock: prev,
            new_stock: next,
            reason: `Refund ${refundNumber}`,
            reference_id: refund.id,
            user_id: processedBy,
          }]);
        }
      }
    }

    // Mark sale as refunded
    await supabase.from('sales').update({ status: 'refunded' }).eq('id', saleId);

    return refund;
  },

  // --------------------------------------------------------------------------
  // STORE SETTINGS
  // --------------------------------------------------------------------------

  async getStoreSettings(tenantId: string): Promise<StoreSettings | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateStoreSettings(tenantId: string, settings: Partial<StoreSettings>) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('store_settings')
      .upsert({
        tenant_id: tenantId,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
