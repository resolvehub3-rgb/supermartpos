import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  BarChart3,
  ScanBarcode,
  Calendar,
  History,
  ShoppingCart,
  Users,
  Clock,
  RotateCcw,
  Settings,
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Eye,
  Printer,
  Trash2,
  Edit,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Product,
  ProductCategory,
  InventoryMovement,
  Sale,
  CashierShift,
  StoreSettings,
} from '../../types/database';
import {
  formatCurrency,
  evaluateExpiryStatus,
  generateInternalBarcode,
  validateRetailBarcode,
} from '../../lib/calculations';
import { BarcodeSvg } from '../../components/common/BarcodeSvg';
import { BarcodeScannerModal } from '../../components/common/BarcodeScannerModal';
import { ThermalReceipt } from '../../components/common/ThermalReceipt';
import { uploadProductImage } from '../../lib/supabase';

interface ShopOwnerDashboardProps {
  initialTab?: string;
}

export const ShopOwnerDashboard: React.FC<ShopOwnerDashboardProps> = ({ initialTab = 'overview' }) => {
  const { currentTenant, user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(true);

  // Tenant Data
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    todaySalesMinor: 0,
    todayTransactionsCount: 0,
    lowStockCount: 0,
    expiringBatchesCount: 0,
    expiredBatchesCount: 0,
    activeCashiersCount: 0,
    openShiftsCount: 0,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [shifts, setShifts] = useState<CashierShift[]>([]);

  // Filtering & Search
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Modals & Drawers
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(1);
  const [adjustReason, setAdjustReason] = useState('Restock shipment received');
  const [adjustType, setAdjustType] = useState<'stock_received' | 'manual_adjustment' | 'damage_writeoff' | 'expired_writeoff'>('stock_received');

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<Sale | null>(null);

  // New Product Form State
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    barcode_type: 'CODE128' as const,
    category_id: '',
    brand: '',
    description: '',
    unit_of_measure: 'pcs',
    purchase_cost_major: '10.00',
    selling_price_major: '15.00',
    available_stock: 20,
    reorder_threshold: 10,
    expiry_date: '',
    image_file: null as File | null,
    image_preview: null as string | null,
  });

  // Generated Barcode Printable State
  const [generatedBarcodeItem, setGeneratedBarcodeItem] = useState<{ sku: string; barcode: string; name: string } | null>(null);

  // Refund Workflow State
  const [refundReceiptSearch, setRefundReceiptSearch] = useState('');
  const [saleForRefund, setSaleForRefund] = useState<Sale | null>(null);
  const [refundQuantity, setRefundQuantity] = useState<Record<string, number>>({});
  const [refundRestock, setRefundRestock] = useState(true);
  const [refundReason, setRefundReason] = useState('Customer return - unopened item');

  const currency = currentTenant?.currency || 'GHS';

  const loadTenantData = async () => {
    if (!currentTenant) return;
    setIsLoading(true);
    try {
      const [stats, settings, prods, cats, movs, sls, sfts] = await Promise.all([
        api.getShopDashboardStats(currentTenant.id),
        api.getStoreSettings(currentTenant.id),
        api.getProducts(currentTenant.id),
        api.getCategories(currentTenant.id),
        api.getInventoryMovements(currentTenant.id),
        api.getSales(currentTenant.id),
        api.getSales(currentTenant.id).then(() => []), // shifts endpoint
      ]);

      setDashboardStats(stats);
      setStoreSettings(settings);
      setProducts(prods);
      setCategories(cats);
      setMovements(movs);
      setSales(sls);
    } catch (err) {
      console.error('Failed to load shop owner data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, [currentTenant]);

  // Handle Product Creation
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !productForm.name || !productForm.barcode) return;

    try {
      let imageUrl: string | null = null;
      if (productForm.image_file) {
        const uploadRes = await uploadProductImage(productForm.image_file, currentTenant.id);
        imageUrl = uploadRes.url;
      }

      const priceMinor = Math.round(parseFloat(productForm.selling_price_major || '0') * 100);
      const costMinor = Math.round(parseFloat(productForm.purchase_cost_major || '0') * 100);

      await api.createProduct(
        {
          tenant_id: currentTenant.id,
          name: productForm.name,
          sku: productForm.sku || `SKU-${Date.now().toString().slice(-5)}`,
          barcode: productForm.barcode,
          barcode_type: productForm.barcode_type,
          category_id: productForm.category_id || null,
          brand: productForm.brand || null,
          description: productForm.description || null,
          unit_of_measure: productForm.unit_of_measure,
          purchase_cost_minor: costMinor,
          selling_price_minor: priceMinor,
          available_stock: productForm.available_stock,
          reorder_threshold: productForm.reorder_threshold,
          image_url: imageUrl,
          is_active: true,
        },
        productForm.expiry_date ? {
          batch_number: `B-${Date.now().toString().slice(-4)}`,
          expiry_date: productForm.expiry_date,
          quantity: productForm.available_stock,
        } : undefined
      );

      setIsProductModalOpen(false);
      setProductForm({
        name: '',
        sku: '',
        barcode: '',
        barcode_type: 'CODE128',
        category_id: '',
        brand: '',
        description: '',
        unit_of_measure: 'pcs',
        purchase_cost_major: '10.00',
        selling_price_major: '15.00',
        available_stock: 20,
        reorder_threshold: 10,
        expiry_date: '',
        image_file: null,
        image_preview: null,
      });
      await loadTenantData();
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  };

  // Handle Stock Adjustment
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !selectedProductForAdjust || !user) return;

    try {
      const delta = adjustType === 'damage_writeoff' || adjustType === 'expired_writeoff' ? -Math.abs(adjustDelta) : Math.abs(adjustDelta);
      await api.adjustStock(
        currentTenant.id,
        selectedProductForAdjust.id,
        delta,
        adjustType,
        adjustReason,
        user.id
      );
      setIsStockAdjustModalOpen(false);
      setSelectedProductForAdjust(null);
      await loadTenantData();
    } catch (err) {
      console.error('Adjustment failed:', err);
    }
  };

  // Generate internal SKU & barcode
  const handleGenerateInternalBarcode = () => {
    const generated = generateInternalBarcode('AFR');
    setProductForm({
      ...productForm,
      sku: generated.sku,
      barcode: generated.barcode,
      barcode_type: 'CODE128',
    });
  };

  // Handle Refund Submission
  const handleProcessRefund = async () => {
    if (!currentTenant || !saleForRefund || !user) return;

    const itemsToRefund = Object.entries(refundQuantity)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, qty]) => {
        const item = saleForRefund.items?.find((i) => i.id === saleItemId);
        const refundAmountMinor = item ? item.unit_price_minor * qty : 0;
        return {
          saleItemId,
          productId: item?.product_id || '',
          quantity: qty,
          refundAmountMinor,
          restock: refundRestock,
        };
      });

    if (itemsToRefund.length === 0) return;

    try {
      await api.processRefund(
        currentTenant.id,
        saleForRefund.id,
        itemsToRefund,
        refundReason,
        user.id
      );
      setSaleForRefund(null);
      setRefundQuantity({});
      await loadTenantData();
      alert('Refund processed successfully.');
    } catch (err) {
      console.error('Refund failed:', err);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase());

    const matchesCat = selectedCategoryFilter === 'all' || p.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-[#E87512] uppercase tracking-wider">
            {currentTenant?.name || 'Supermarket'}
          </span>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
            Store Owner Operations
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time supermarket catalog, barcode label printing, inventory tracking, and sales analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg max-w-4xl mb-8 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'products', label: `Products (${products.length})` },
          { id: 'barcodes', label: 'Barcodes' },
          { id: 'expiry', label: 'Expiry Tracking' },
          { id: 'inventory', label: 'Stock Movements' },
          { id: 'sales', label: `Sales (${sales.length})` },
          { id: 'refunds', label: 'Returns & Refunds' },
          { id: 'reports', label: 'Reports & Export' },
          { id: 'settings', label: 'Store Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Today's Recorded Sales</span>
              <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
                {formatCurrency(dashboardStats.todaySalesMinor, currency)}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                {dashboardStats.todayTransactionsCount} confirmed transactions today
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Active Stock Count</span>
              <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
                {products.length}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                Across all store categories
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Low Stock Warnings</span>
              <p className={`text-2xl font-bold mt-2 tabular-nums ${dashboardStats.lowStockCount > 0 ? 'text-amber-600' : 'text-neutral-900'}`}>
                {dashboardStats.lowStockCount}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                Items at or below reorder threshold
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Open Register Shifts</span>
              <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
                {dashboardStats.openShiftsCount}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                {dashboardStats.activeCashiersCount} cashier(s) currently on terminal
              </p>
            </div>
          </div>

          {/* Recent Sales List */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Recent Completed Sales</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Transactions completed in your supermarket via Cashier POS.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('sales')}
                className="text-xs font-semibold text-[#E87512] hover:underline"
              >
                View all sales
              </button>
            </div>

            {sales.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-500">
                No sales recorded yet. Completed POS transactions will appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="px-5 py-3">Receipt No</th>
                      <th className="px-5 py-3">Date & Time</th>
                      <th className="px-5 py-3">Cashier</th>
                      <th className="px-5 py-3">Payment</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-5 py-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sales.slice(0, 5).map((sale) => (
                      <tr key={sale.id} className="hover:bg-neutral-50">
                        <td className="px-5 py-3 font-mono font-semibold text-neutral-900">{sale.receipt_number}</td>
                        <td className="px-5 py-3 text-neutral-500">
                          {new Date(sale.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 font-medium text-neutral-800">
                          {sale.cashier?.full_name || 'Staff'}
                        </td>
                        <td className="px-5 py-3 capitalize text-neutral-600">{sale.payment_method}</td>
                        <td className="px-5 py-3 text-right font-bold text-neutral-900 tabular-nums">
                          {formatCurrency(sale.total_minor, currency)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setSelectedSaleForReprint(sale)}
                            className="p-1 text-neutral-500 hover:text-[#E87512] transition-colors"
                            title="Reprint Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Controls: Search, Filter, Add */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by name, SKU, or barcode..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-neutral-300 rounded bg-white text-neutral-700 outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBarcodeModalOpen(true)}
                className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
              >
                <ScanBarcode className="w-3.5 h-3.5 text-neutral-500" />
                <span>Scan to Find</span>
              </button>
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="px-3 py-1.5 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-500 space-y-2">
                <p>No products found matching your search.</p>
                <button
                  onClick={() => setIsProductModalOpen(true)}
                  className="text-xs font-semibold text-[#E87512] hover:underline"
                >
                  Create your first product
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="px-5 py-3">Product Name</th>
                      <th className="px-5 py-3">Barcode</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Selling Price</th>
                      <th className="px-5 py-3">Stock Available</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredProducts.map((p) => {
                      const isLowStock = p.available_stock <= p.reorder_threshold;
                      return (
                        <tr key={p.id} className="hover:bg-neutral-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-9 h-9 object-cover rounded border border-neutral-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 bg-neutral-100 rounded border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-neutral-900">{p.name}</div>
                                <div className="text-[11px] text-neutral-400 font-mono">{p.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-neutral-600">{p.barcode}</td>
                          <td className="px-5 py-3 text-neutral-600">{p.category?.name || 'Uncategorized'}</td>
                          <td className="px-5 py-3 font-semibold text-neutral-900 tabular-nums">
                            {formatCurrency(p.selling_price_minor, currency)}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`font-semibold tabular-nums ${isLowStock ? 'text-amber-700' : 'text-neutral-900'}`}>
                              {p.available_stock} {p.unit_of_measure}
                            </span>
                            {isLowStock && (
                              <span className="ml-1 text-[10px] text-amber-600 font-medium">(Low)</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-semibold ${p.is_active ? 'text-emerald-700' : 'text-neutral-400'}`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedProductForAdjust(p);
                                setIsStockAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold rounded text-[11px] transition-colors"
                            >
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => {
                                setGeneratedBarcodeItem({ sku: p.sku, barcode: p.barcode, name: p.name });
                                setActiveTab('barcodes');
                              }}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded text-[11px] transition-colors"
                            >
                              Print Label
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BARCODE MANAGEMENT */}
      {activeTab === 'barcodes' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-neutral-200">
            <h3 className="font-bold text-sm text-neutral-900">Barcode Label Generation & Printing</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Generate retail-standard Code 128 barcodes for store-packaged products and preview printable label sheets.
            </p>

            <div className="mt-6 p-6 border border-neutral-200 rounded-lg bg-neutral-50 flex flex-col items-center max-w-sm mx-auto text-center">
              <h4 className="font-bold text-xs text-neutral-900">
                {generatedBarcodeItem?.name || 'Store Packaged Item'}
              </h4>
              <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                {generatedBarcodeItem?.sku || 'AFR-SKU-9901'}
              </p>

              <div className="my-4 bg-white p-3 rounded border border-neutral-200">
                <BarcodeSvg
                  value={generatedBarcodeItem?.barcode || 'AFR-990123'}
                  format="CODE128"
                  height={44}
                  width={1.6}
                />
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Barcode Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPIRY MANAGEMENT */}
      {activeTab === 'expiry' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-900">Batch Expiry Management</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Expired items are strictly prohibited from cashier checkout by default.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">Barcode</th>
                  <th className="px-5 py-3">Batch Number</th>
                  <th className="px-5 py-3">Expiry Date</th>
                  <th className="px-5 py-3">Days Remaining</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.filter(p => p.batches && p.batches.length > 0).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                      No batch expiry dates registered. When adding products, specify an expiry date to track batches.
                    </td>
                  </tr>
                ) : (
                  products.flatMap(p => (p.batches || []).map(b => {
                    const evalRes = evaluateExpiryStatus(b.expiry_date, storeSettings?.expiry_warning_days || 30);
                    return (
                      <tr key={b.id} className="hover:bg-neutral-50">
                        <td className="px-5 py-3 font-semibold text-neutral-900">{p.name}</td>
                        <td className="px-5 py-3 font-mono text-neutral-600">{p.barcode}</td>
                        <td className="px-5 py-3 font-mono">{b.batch_number}</td>
                        <td className="px-5 py-3">{b.expiry_date}</td>
                        <td className="px-5 py-3 tabular-nums font-semibold">
                          {evalRes.daysRemaining !== null ? `${evalRes.daysRemaining} days` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`font-semibold text-[11px] ${
                              evalRes.status === 'expired'
                                ? 'text-red-700'
                                : evalRes.status === 'approaching_expiry'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {evalRes.status === 'expired' ? 'EXPIRED (BLOCKED)' : evalRes.status === 'approaching_expiry' ? 'EXPIRING SOON' : 'FRESH'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedProductForAdjust(p);
                              setAdjustType('expired_writeoff');
                              setAdjustReason(`Expired batch ${b.batch_number} written off`);
                              setIsStockAdjustModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded text-[11px] border border-red-200"
                          >
                            Write Off
                          </button>
                        </td>
                      </tr>
                    );
                  }))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INVENTORY MOVEMENTS */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-900">Inventory Movement Audit Trail</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Auditable record of every stock deduction, intake, write-off, and return.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">Movement Type</th>
                  <th className="px-5 py-3">Quantity Delta</th>
                  <th className="px-5 py-3">Prev → New</th>
                  <th className="px-5 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                      No inventory movements logged yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 text-neutral-500">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3 font-semibold text-neutral-900">{m.product_name || 'Item'}</td>
                      <td className="px-5 py-3 capitalize text-neutral-700 font-medium">{m.movement_type.replace('_', ' ')}</td>
                      <td className="px-5 py-3 font-mono font-bold tabular-nums">
                        <span className={m.quantity_delta > 0 ? 'text-emerald-700' : 'text-red-700'}>
                          {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-neutral-600">{m.previous_stock} → {m.new_stock}</td>
                      <td className="px-5 py-3 text-neutral-500 text-[11px]">{m.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SALES & RECEIPTS */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Completed Supermarket Transactions</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Every sale recorded with line items, tax breakdown, and cashier identifier.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="px-5 py-3">Receipt Number</th>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Cashier</th>
                  <th className="px-5 py-3">Payment Method</th>
                  <th className="px-5 py-3">Items Count</th>
                  <th className="px-5 py-3 text-right">Total Paid</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                      No sales recorded yet. Completed checkout transactions will appear here.
                    </td>
                  </tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 font-mono font-bold text-neutral-900">{s.receipt_number}</td>
                      <td className="px-5 py-3 text-neutral-500">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3 font-medium text-neutral-800">{s.cashier?.full_name || 'Cashier'}</td>
                      <td className="px-5 py-3 capitalize text-neutral-700">{s.payment_method}</td>
                      <td className="px-5 py-3 tabular-nums">{s.items?.length || 1} lines</td>
                      <td className="px-5 py-3 text-right font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(s.total_minor, currency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelectedSaleForReprint(s)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Reprint Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: RETURNS & REFUNDS */}
      {activeTab === 'refunds' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-sm text-neutral-900">Process Customer Return & Refund</h3>
            <p className="text-xs text-neutral-500">
              Lookup the original transaction using the receipt number, select items to return, and choose whether to restock.
            </p>

            <div className="flex gap-3 max-w-md">
              <input
                type="text"
                value={refundReceiptSearch}
                onChange={(e) => setRefundReceiptSearch(e.target.value)}
                placeholder="Scan or enter Receipt No (e.g. RCP-102941-892)"
                className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const found = sales.find((s) => s.receipt_number.toLowerCase() === refundReceiptSearch.trim().toLowerCase());
                  if (found) {
                    setSaleForRefund(found);
                    const initialQty: Record<string, number> = {};
                    found.items?.forEach((i) => {
                      initialQty[i.id] = 0;
                    });
                    setRefundQuantity(initialQty);
                  } else {
                    alert('Sale with that receipt number not found.');
                  }
                }}
                className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded"
              >
                Find Sale
              </button>
            </div>

            {saleForRefund && (
              <div className="pt-4 border-t border-neutral-200 space-y-4">
                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-xs flex justify-between">
                  <span><strong>Receipt:</strong> {saleForRefund.receipt_number}</span>
                  <span><strong>Total Original:</strong> {formatCurrency(saleForRefund.total_minor, currency)}</span>
                  <span><strong>Date:</strong> {new Date(saleForRefund.created_at).toLocaleDateString()}</span>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-2">Item Name</th>
                      <th className="px-4 py-2">Unit Price</th>
                      <th className="px-4 py-2">Original Qty</th>
                      <th className="px-4 py-2">Qty to Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {saleForRefund.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium">{item.product_name}</td>
                        <td className="px-4 py-2">{formatCurrency(item.unit_price_minor, currency)}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={refundQuantity[item.id] || 0}
                            onChange={(e) => {
                              const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value || '0', 10)));
                              setRefundQuantity({ ...refundQuantity, [item.id]: val });
                            }}
                            className="w-16 px-2 py-1 border border-neutral-300 rounded font-mono text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    id="restock-chk"
                    checked={refundRestock}
                    onChange={(e) => setRefundRestock(e.target.checked)}
                    className="rounded text-[#E87512] focus:ring-[#E87512]"
                  />
                  <label htmlFor="restock-chk">Return goods back to available inventory (Restock)</label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full max-w-md px-3 py-1.5 text-xs border border-neutral-300 rounded"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleProcessRefund}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded"
                >
                  Confirm & Process Refund
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: REPORTS & EXPORT */}
      {activeTab === 'reports' && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Supermarket Financial & Inventory Reports</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Calculated directly from real database records in your store.
              </p>
            </div>

            <button
              onClick={() => {
                const csvRows = [
                  ['Receipt No', 'Date', 'Payment Method', 'Total Minor', 'Status'],
                  ...sales.map(s => [s.receipt_number, s.created_at, s.payment_method, s.total_minor, s.status])
                ];
                const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `sales_report_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Sales CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-xs text-neutral-500">Total Recorded Sales (All Time)</span>
              <p className="text-xl font-bold text-neutral-900 mt-1 tabular-nums">
                {formatCurrency(sales.reduce((acc, s) => acc + s.total_minor, 0), currency)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-xs text-neutral-500">Total Units in Inventory</span>
              <p className="text-xl font-bold text-neutral-900 mt-1 tabular-nums">
                {products.reduce((acc, p) => acc + p.available_stock, 0).toLocaleString()} pcs
              </p>
            </div>
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-xs text-neutral-500">Total Transactions Count</span>
              <p className="text-xl font-bold text-neutral-900 mt-1 tabular-nums">
                {sales.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-sm text-neutral-900">Store Settings & Thermal Receipt Policy</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customize receipt header, return policy, and tax rules for this supermarket.
            </p>
          </div>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Receipt Trading Name</label>
              <input
                type="text"
                value={storeSettings?.trading_name || currentTenant?.name || ''}
                onChange={(e) => setStoreSettings(storeSettings ? { ...storeSettings, trading_name: e.target.value } : null)}
                className="w-full px-3 py-2 border border-neutral-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Receipt Footer Note</label>
              <input
                type="text"
                value={storeSettings?.receipt_footer || ''}
                onChange={(e) => setStoreSettings(storeSettings ? { ...storeSettings, receipt_footer: e.target.value } : null)}
                className="w-full px-3 py-2 border border-neutral-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Return Policy on Receipt</label>
              <textarea
                rows={2}
                value={storeSettings?.receipt_return_policy || ''}
                onChange={(e) => setStoreSettings(storeSettings ? { ...storeSettings, receipt_return_policy: e.target.value } : null)}
                className="w-full px-3 py-2 border border-neutral-300 rounded"
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                if (currentTenant && storeSettings) {
                  await api.updateStoreSettings(currentTenant.id, storeSettings);
                  alert('Settings updated successfully.');
                }
              }}
              className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded"
            >
              Save Store Settings
            </button>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden border border-neutral-200">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Register New Product</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Scan an existing physical barcode or generate an internal Code 128 identifier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Milo Chocolate Drink 400g"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Barcode *</label>
                  <input
                    type="text"
                    required
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    placeholder="Scan or type digits"
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded"
                  />
                </div>
                <div className="flex items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsBarcodeModalOpen(true)}
                    className="flex-1 py-2 px-2 border border-[#E87512] text-[#E87512] text-xs font-semibold rounded hover:bg-[#FDF3E7] transition-colors"
                  >
                    Scan Barcode
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateInternalBarcode}
                    className="flex-1 py-2 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded transition-colors"
                  >
                    Generate Code
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Selling Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.selling_price_major}
                    onChange={(e) => setProductForm({ ...productForm, selling_price_major: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Purchase Cost ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.purchase_cost_major}
                    onChange={(e) => setProductForm({ ...productForm, purchase_cost_major: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    value={productForm.available_stock}
                    onChange={(e) => setProductForm({ ...productForm, available_stock: parseInt(e.target.value || '0', 10) })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={productForm.expiry_date}
                    onChange={(e) => setProductForm({ ...productForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Product Photograph (Optional)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProductForm({
                        ...productForm,
                        image_file: file,
                        image_preview: URL.createObjectURL(file),
                      });
                    }
                  }}
                  className="w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#FDF3E7] file:text-[#E87512] hover:file:bg-[#E87512]/20"
                />
                {productForm.image_preview && (
                  <img
                    src={productForm.image_preview}
                    alt="Preview"
                    className="mt-2 w-16 h-16 object-cover rounded border border-neutral-200"
                  />
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-bold rounded shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isStockAdjustModalOpen && selectedProductForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-neutral-200">
            <div className="p-6 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-neutral-900">Adjust Inventory Stock</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Current stock: <strong className="font-mono text-neutral-800">{selectedProductForAdjust.available_stock} {selectedProductForAdjust.unit_of_measure}</strong>
              </p>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white"
                >
                  <option value="stock_received">Stock Received (Intake / Restock)</option>
                  <option value="manual_adjustment">Manual Count Correction</option>
                  <option value="damage_writeoff">Damaged Goods Write-off</option>
                  <option value="expired_writeoff">Expired Stock Write-off</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Quantity Delta</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(parseInt(e.target.value || '1', 10))}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Audit Reason *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Shipment invoice #INV-4928"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockAdjustModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-bold rounded"
                >
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onBarcodeDetected={(code) => {
          if (isProductModalOpen) {
            setProductForm({ ...productForm, barcode: code });
          } else {
            setProductSearch(code);
          }
        }}
        title="Scan Retail Barcode"
      />

      {/* Thermal Receipt Reprint Preview */}
      {selectedSaleForReprint && (
        <ThermalReceipt
          sale={selectedSaleForReprint}
          storeSettings={storeSettings}
          tenant={currentTenant}
          isReprint={true}
          onClose={() => setSelectedSaleForReprint(null)}
        />
      )}
    </div>
  );
};
