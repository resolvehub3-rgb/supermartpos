import React, { useState, useEffect, useRef } from 'react';
import {
  ScanBarcode,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  DollarSign,
  Printer,
  Clock,
  RotateCcw,
  Camera,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Product,
  ProductCategory,
  CashierShift,
  Sale,
  StoreSettings,
} from '../../types/database';
import {
  calculateLineTotal,
  calculateCartSummary,
  calculateChangeDue,
  evaluateExpiryStatus,
  formatCurrency,
} from '../../lib/calculations';
import { ThermalReceipt } from '../../components/common/ThermalReceipt';
import { BarcodeScannerModal } from '../../components/common/BarcodeScannerModal';

interface CashierPosViewProps {}

interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage?: number;
}

export const CashierPosView: React.FC<CashierPosViewProps> = () => {
  const { currentTenant, user } = useAuth();
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);

  // Search & Barcode state
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('100.00');
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [closingCashInput, setClosingCashInput] = useState('0.00');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [amountTenderedInput, setAmountTenderedInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money'>('cash');
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const currency = currentTenant?.currency || 'GHS';

  // Load Shift and Catalog
  const loadData = async () => {
    if (!currentTenant || !user) return;
    setIsLoading(true);
    try {
      const [shift, settings, prods, cats] = await Promise.all([
        api.getActiveShift(currentTenant.id, user.id),
        api.getStoreSettings(currentTenant.id),
        api.getProducts(currentTenant.id),
        api.getCategories(currentTenant.id),
      ]);

      setActiveShift(shift);
      setStoreSettings(settings);
      setProducts(prods);
      setCategories(cats);

      if (!shift) {
        setIsOpenShiftModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load cashier data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant, user]);

  // Keep barcode input focused for physical USB scanner guns
  useEffect(() => {
    if (!isOpenShiftModalOpen && !isPaymentModalOpen && !isCloseShiftModalOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [isOpenShiftModalOpen, isPaymentModalOpen, isCloseShiftModalOpen, cart]);

  // Calculate cart summary
  const summary = calculateCartSummary(
    cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      unitPriceMinor: item.product.selling_price_minor,
      quantity: item.quantity,
      discountPercentage: item.discountPercentage,
    })),
    {
      enabled: storeSettings?.tax_enabled || false,
      ratePercentage: storeSettings?.tax_rate_percentage || 0,
      inclusive: storeSettings?.tax_inclusive || false,
    },
    orderDiscountPercent
  );

  // Add Product to Cart with Expiry & Stock Verification
  const addProductToCart = (product: Product, quantityToAdd: number = 1) => {
    // 1. Expiry Check: Block expired products
    if (product.batches && product.batches.length > 0) {
      const hasExpiredBatch = product.batches.some(
        (b) => evaluateExpiryStatus(b.expiry_date).status === 'expired'
      );
      if (hasExpiredBatch) {
        setScanMessage({
          text: `BLOCKED: "${product.name}" has expired batches and cannot be sold.`,
          type: 'error',
        });
        return;
      }
    }

    // 2. Check existing cart quantity
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;
    const nextQty = currentQtyInCart + quantityToAdd;

    // 3. Stock warning / limit
    if (nextQty > product.available_stock && !storeSettings?.allow_negative_stock) {
      setScanMessage({
        text: `Stock limit reached: only ${product.available_stock} available in inventory.`,
        type: 'warning',
      });
      if (currentQtyInCart >= product.available_stock) {
        return;
      }
    }

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity = nextQty;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: quantityToAdd }]);
    }

    setScanMessage({
      text: `Added ${product.name} to cart.`,
      type: 'success',
    });
  };

  // Barcode Gun Form Submit (Instant scanner input)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeQuery.trim();
    if (!clean) return;

    const matched = products.find(
      (p) => p.barcode.toLowerCase() === clean.toLowerCase() || p.sku.toLowerCase() === clean.toLowerCase()
    );

    if (matched) {
      addProductToCart(matched, 1);
      setBarcodeQuery('');
    } else {
      setScanMessage({
        text: `Barcode "${clean}" not found in supermarket database.`,
        type: 'error',
      });
      setBarcodeQuery('');
    }
  };

  // Shift Management Handlers
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !user) return;

    const openingMinor = Math.round(parseFloat(openingCashInput || '0') * 100);
    try {
      const shift = await api.openShift(currentTenant.id, user.id, openingMinor, 'REG-01');
      setActiveShift(shift);
      setIsOpenShiftModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to open shift');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const closingMinor = Math.round(parseFloat(closingCashInput || '0') * 100);
    try {
      const closed = await api.closeShift(activeShift.id, closingMinor);
      setActiveShift(null);
      setIsCloseShiftModalOpen(false);
      alert(
        `Shift closed. Expected: ${formatCurrency(closed.expected_cash_minor || 0, currency)}, Counted: ${formatCurrency(
          closingMinor,
          currency
        )}, Discrepancy: ${formatCurrency(closed.cash_discrepancy_minor || 0, currency)}`
      );
      setIsOpenShiftModalOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to close shift');
    }
  };

  // Process Checkout
  const handleFinalizeSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !user || !activeShift || cart.length === 0) return;

    const tenderedMinor =
      paymentMethod === 'cash'
        ? Math.round(parseFloat(amountTenderedInput || '0') * 100)
        : summary.grandTotalMinor;

    const changeRes = calculateChangeDue(summary.grandTotalMinor, tenderedMinor);
    if (!changeRes.isValid && paymentMethod === 'cash') {
      alert(`Insufficient cash tendered. Balance short by ${formatCurrency(changeRes.shortageMinor, currency)}`);
      return;
    }

    setIsProcessingSale(true);
    try {
      const sale = await api.processSale({
        tenantId: currentTenant.id,
        shiftId: activeShift.id,
        cashierId: user.id,
        registerId: 'REG-01',
        items: cart.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          unitPriceMinor: i.product.selling_price_minor,
          purchaseCostMinor: i.product.purchase_cost_minor,
          quantity: i.quantity,
          lineTotalMinor: i.product.selling_price_minor * i.quantity,
        })),
        subtotalMinor: summary.subtotalMinor,
        discountMinor: summary.discountMinor,
        taxMinor: summary.taxMinor,
        totalMinor: summary.grandTotalMinor,
        paymentMethod,
        amountTenderedMinor: tenderedMinor,
        changeDueMinor: changeRes.changeDueMinor,
      });

      setCompletedSale(sale);
      setCart([]);
      setIsPaymentModalOpen(false);
      setAmountTenderedInput('');
      await loadData();
    } catch (err: unknown) {
      console.error('Checkout failed:', err);
      alert(err instanceof Error ? err.message : 'Transaction failed to complete');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Product Filter
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);

    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-neutral-100 overflow-hidden">
      {/* Cashier Shift HUD Strip */}
      <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Terminal: REG-01</span>
          </div>
          <span>·</span>
          <div className="text-neutral-600">
            Cashier: <strong className="text-neutral-900">{user?.full_name}</strong>
          </div>
          <span>·</span>
          <div className="text-neutral-600">
            Shift: <strong className="text-neutral-900 font-mono">{activeShift ? 'OPEN' : 'CLOSED'}</strong>
            {activeShift && (
              <span className="ml-1.5 text-neutral-500">
                (Float: {formatCurrency(activeShift.opening_cash_minor, currency)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeShift && (
            <button
              onClick={() => {
                setClosingCashInput((summary.grandTotalMinor / 100).toFixed(2));
                setIsCloseShiftModalOpen(true);
              }}
              className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>End Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Main POS Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Product Catalog & Barcode Scanner Area */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-neutral-200">
          {/* Top Barcode Gun Receiver Input */}
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-xs mb-3">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <ScanBarcode className="w-4 h-4 text-[#E87512] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  placeholder="Scan barcode gun or enter digits..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded shrink-0 shadow-xs"
              >
                Scan Item
              </button>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                title="Camera Scanner"
                className="p-2 border border-neutral-300 hover:bg-neutral-50 rounded text-neutral-600 shrink-0"
              >
                <Camera className="w-4 h-4" />
              </button>
            </form>

            {/* Scan Message Alert */}
            {scanMessage && (
              <div
                className={`mt-2 p-2 rounded text-xs flex items-center justify-between ${
                  scanMessage.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : scanMessage.type === 'warning'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span>{scanMessage.text}</span>
                <button
                  onClick={() => setScanMessage(null)}
                  className="text-neutral-400 hover:text-neutral-700 font-bold ml-2 text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Product Search & Category Filters */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded bg-white outline-none"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-neutral-300 rounded bg-white text-neutral-700 outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">
                No products found. Add products in Store Admin or adjust your search filter.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.available_stock <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock && !storeSettings?.allow_negative_stock}
                      onClick={() => addProductToCart(p, 1)}
                      className="bg-white p-3 rounded-lg border border-neutral-200 hover:border-[#E87512] transition-all text-left flex flex-col justify-between group disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <div>
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full aspect-square object-cover rounded mb-2 border border-neutral-100"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-neutral-50 rounded mb-2 border border-neutral-100 flex items-center justify-center text-neutral-400">
                            <ShoppingCart className="w-6 h-6" />
                          </div>
                        )}
                        <h4 className="font-semibold text-xs text-neutral-900 group-hover:text-[#E87512] line-clamp-2 leading-tight">
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-mono">{p.barcode}</span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <span className="font-bold text-xs text-neutral-900 tabular-nums">
                          {formatCurrency(p.selling_price_minor, currency)}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {p.available_stock} in stock
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Shopping Cart */}
        <div className="w-96 bg-white flex flex-col justify-between shadow-xs">
          {/* Cart Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#E87512]" />
              <h3 className="font-bold text-sm text-neutral-900">Current Cart</h3>
              <span className="text-xs text-neutral-400">({cart.length} items)</span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all items from current cart?')) {
                    setCart([]);
                  }
                }}
                className="text-xs text-neutral-400 hover:text-red-600 transition-colors"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-xs text-center space-y-2">
                <ShoppingCart className="w-8 h-8 opacity-40" />
                <p>Cart is currently empty.</p>
                <p className="text-[11px] text-neutral-400">Scan product barcodes or click items from catalog.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={item.product.id}
                  className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <h4 className="font-semibold text-xs text-neutral-900 line-clamp-1">
                        {item.product.name}
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {formatCurrency(item.product.selling_price_minor, currency)} / unit
                      </span>
                    </div>
                    <span className="font-bold text-xs text-neutral-900 tabular-nums">
                      {formatCurrency(item.product.selling_price_minor * item.quantity, currency)}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 border border-neutral-300 rounded bg-white px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            const updated = [...cart];
                            updated[idx].quantity -= 1;
                            setCart(updated);
                          } else {
                            setCart(cart.filter((_, i) => i !== idx));
                          }
                        }}
                        className="p-1 hover:text-[#E87512] text-neutral-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...cart];
                          updated[idx].quantity += 1;
                          setCart(updated);
                        }}
                        className="p-1 hover:text-[#E87512] text-neutral-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                      className="text-neutral-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Pay CTA */}
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="tabular-nums font-semibold">{formatCurrency(summary.subtotalMinor, currency)}</span>
            </div>
            {summary.discountMinor > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span className="tabular-nums font-semibold">-{formatCurrency(summary.discountMinor, currency)}</span>
              </div>
            )}
            {summary.taxMinor > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>{storeSettings?.tax_label || 'VAT'}</span>
                <span className="tabular-nums font-semibold">{formatCurrency(summary.taxMinor, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-200">
              <span>Total Payable</span>
              <span className="text-base text-[#E87512] tabular-nums">
                {formatCurrency(summary.grandTotalMinor, currency)}
              </span>
            </div>

            <button
              type="button"
              disabled={cart.length === 0 || !activeShift}
              onClick={() => {
                setAmountTenderedInput((summary.grandTotalMinor / 100).toFixed(2));
                setIsPaymentModalOpen(true);
              }}
              className="w-full py-3 bg-[#E87512] hover:bg-[#C96009] disabled:bg-neutral-300 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors mt-2 shadow-xs"
            >
              <DollarSign className="w-4 h-4" />
              <span>Collect Payment</span>
            </button>
          </div>
        </div>
      </div>

      {/* OPEN SHIFT MODAL */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-neutral-900">Open Register Shift</h3>
            <p className="text-xs text-neutral-500">
              Shift management is mandatory. Enter your starting cash float in the cash drawer to begin scanning.
            </p>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Opening Cash Float ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#E87512] hover:bg-[#C96009] text-white font-bold text-xs rounded transition-colors"
              >
                Confirm & Open Shift
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {isCloseShiftModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-neutral-900">Close Cashier Shift</h3>
            <p className="text-xs text-neutral-500">
              Perform end-of-day register count reconciliation. Enter actual counted cash in the drawer.
            </p>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Shift Started:</span>
                  <span>{new Date(activeShift.opened_at).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Opening Float:</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(activeShift.opening_cash_minor, currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Actual Counted Cash ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingCashInput}
                  onChange={(e) => setClosingCashInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded"
                >
                  Finalize & Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT TENDER MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-neutral-200">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Checkout & Tender Payment</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Total Payable: <strong className="text-[#E87512] text-sm tabular-nums">{formatCurrency(summary.grandTotalMinor, currency)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFinalizeSale} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'card', label: 'Card' },
                    { id: 'mobile_money', label: 'Mobile Money' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2 px-2 border rounded-lg text-xs font-semibold transition-all ${
                        paymentMethod === m.id
                          ? 'border-[#E87512] bg-[#FDF3E7] text-[#E87512]'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Amount Tendered by Customer ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountTenderedInput}
                    onChange={(e) => setAmountTenderedInput(e.target.value)}
                    className="w-full px-3 py-2 text-base font-mono font-bold border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                  />

                  {/* Calculated Change Display */}
                  {(() => {
                    const tenderedMinor = Math.round(parseFloat(amountTenderedInput || '0') * 100);
                    const changeRes = calculateChangeDue(summary.grandTotalMinor, tenderedMinor);
                    return (
                      <div className="mt-2 p-2.5 rounded bg-neutral-50 border border-neutral-200 flex justify-between items-center text-xs">
                        <span className="text-neutral-600 font-medium">Change Due:</span>
                        <span
                          className={`font-bold font-mono text-sm ${
                            changeRes.isValid ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {changeRes.isValid
                            ? formatCurrency(changeRes.changeDueMinor, currency)
                            : `Short by ${formatCurrency(changeRes.shortageMinor, currency)}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingSale}
                  className="px-5 py-2.5 bg-[#E87512] hover:bg-[#C96009] disabled:bg-neutral-300 text-white text-xs font-bold rounded shadow-xs"
                >
                  {isProcessingSale ? 'Completing Sale...' : 'Confirm & Complete Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA BARCODE MODAL */}
      <BarcodeScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onBarcodeDetected={(code) => {
          const matched = products.find(
            (p) => p.barcode.toLowerCase() === code.toLowerCase() || p.sku.toLowerCase() === code.toLowerCase()
          );
          if (matched) {
            addProductToCart(matched, 1);
          } else {
            setScanMessage({ text: `Barcode "${code}" not found.`, type: 'error' });
          }
        }}
        title="Camera Retail Scanner"
      />

      {/* COMPLETED SALE RECEIPT MODAL */}
      {completedSale && (
        <ThermalReceipt
          sale={completedSale}
          storeSettings={storeSettings}
          tenant={currentTenant}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};
