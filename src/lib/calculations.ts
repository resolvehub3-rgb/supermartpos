/**
 * Pure calculation logic for Afrimart POS
 * Unit tested with Node.js built-in test runner (node:test)
 */

export interface CartLineItem {
  productId: string;
  name: string;
  unitPriceMinor: number; // in cents/pesewas
  quantity: number;
  discountPercentage?: number;
}

export interface TaxSettings {
  enabled: boolean;
  ratePercentage: number;
  inclusive: boolean;
}

/**
 * Calculate line item total in minor currency units (e.g. pesewas or cents)
 */
export function calculateLineTotal(item: CartLineItem): number {
  if (item.quantity <= 0) return 0;
  const baseTotal = item.unitPriceMinor * item.quantity;
  if (!item.discountPercentage || item.discountPercentage <= 0) {
    return Math.round(baseTotal);
  }
  const discountFactor = (100 - Math.min(100, Math.max(0, item.discountPercentage))) / 100;
  return Math.round(baseTotal * discountFactor);
}

/**
 * Calculate cart summary totals (subtotal, tax, grand total)
 */
export function calculateCartSummary(
  items: CartLineItem[],
  taxSettings: TaxSettings,
  orderDiscountPercentage: number = 0
): {
  subtotalMinor: number;
  discountMinor: number;
  taxableAmountMinor: number;
  taxMinor: number;
  grandTotalMinor: number;
} {
  const rawSubtotal = items.reduce((acc, item) => acc + calculateLineTotal(item), 0);
  
  // Apply order-level discount
  const clampedDiscount = Math.min(100, Math.max(0, orderDiscountPercentage));
  const discountMinor = Math.round((rawSubtotal * clampedDiscount) / 100);
  const netSubtotal = Math.max(0, rawSubtotal - discountMinor);

  if (!taxSettings.enabled || taxSettings.ratePercentage <= 0) {
    return {
      subtotalMinor: rawSubtotal,
      discountMinor,
      taxableAmountMinor: netSubtotal,
      taxMinor: 0,
      grandTotalMinor: netSubtotal,
    };
  }

  const rate = taxSettings.ratePercentage / 100;

  if (taxSettings.inclusive) {
    // Tax is included inside prices
    const netBase = Math.round(netSubtotal / (1 + rate));
    const taxMinor = netSubtotal - netBase;
    return {
      subtotalMinor: rawSubtotal,
      discountMinor,
      taxableAmountMinor: netBase,
      taxMinor,
      grandTotalMinor: netSubtotal,
    };
  } else {
    // Tax is added on top of prices
    const taxMinor = Math.round(netSubtotal * rate);
    return {
      subtotalMinor: rawSubtotal,
      discountMinor,
      taxableAmountMinor: netSubtotal,
      taxMinor,
      grandTotalMinor: netSubtotal + taxMinor,
    };
  }
}

/**
 * Calculate change due in minor currency units
 */
export function calculateChangeDue(grandTotalMinor: number, amountTenderedMinor: number): {
  isValid: boolean;
  changeDueMinor: number;
  shortageMinor: number;
} {
  if (amountTenderedMinor < grandTotalMinor) {
    return {
      isValid: false,
      changeDueMinor: 0,
      shortageMinor: grandTotalMinor - amountTenderedMinor,
    };
  }
  return {
    isValid: true,
    changeDueMinor: amountTenderedMinor - grandTotalMinor,
    shortageMinor: 0,
  };
}

/**
 * Calculate expected shift cash and discrepancy
 */
export function calculateShiftReconciliation(
  openingCashMinor: number,
  cashSalesMinor: number,
  cashRefundsMinor: number,
  actualClosingCashMinor: number
): {
  expectedCashMinor: number;
  discrepancyMinor: number; // positive = overage, negative = shortage
  isBalanced: boolean;
} {
  const expectedCashMinor = openingCashMinor + cashSalesMinor - cashRefundsMinor;
  const discrepancyMinor = actualClosingCashMinor - expectedCashMinor;
  return {
    expectedCashMinor,
    discrepancyMinor,
    isBalanced: discrepancyMinor === 0,
  };
}

/**
 * Expiry status check
 */
export type ExpiryStatus = 'fresh' | 'approaching_expiry' | 'expired';

export function evaluateExpiryStatus(
  expiryDateStr: string | null | undefined,
  warningDaysThreshold: number = 30,
  referenceDate: Date = new Date()
): {
  status: ExpiryStatus;
  daysRemaining: number | null;
  isSaleBlocked: boolean;
} {
  if (!expiryDateStr) {
    return { status: 'fresh', daysRemaining: null, isSaleBlocked: false };
  }

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return { status: 'fresh', daysRemaining: null, isSaleBlocked: false };
  }

  // Calculate difference in whole days
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const exp = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const diffTime = exp.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining, isSaleBlocked: true };
  } else if (daysRemaining <= warningDaysThreshold) {
    return { status: 'approaching_expiry', daysRemaining, isSaleBlocked: false };
  } else {
    return { status: 'fresh', daysRemaining, isSaleBlocked: false };
  }
}

/**
 * Validate EAN-13 barcode with standard modulo 10 checksum
 */
export function validateEAN13(barcode: string): boolean {
  const clean = barcode.trim();
  if (!/^\d{13}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(clean[12], 10);
}

/**
 * Validate retail barcode format (EAN-13, EAN-8, UPC-A, UPC-E, Code 128)
 */
export function validateRetailBarcode(barcode: string): {
  isValid: boolean;
  format: 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' | 'CODE128' | 'INVALID';
} {
  const clean = barcode.trim();
  if (!clean) return { isValid: false, format: 'INVALID' };

  if (/^\d{13}$/.test(clean)) {
    if (validateEAN13(clean)) {
      return { isValid: true, format: 'EAN13' };
    }
  }

  if (/^\d{8}$/.test(clean)) {
    return { isValid: true, format: 'EAN8' };
  }

  if (/^\d{12}$/.test(clean)) {
    return { isValid: true, format: 'UPCA' };
  }

  if (/^\d{6,8}$/.test(clean)) {
    return { isValid: true, format: 'UPCE' };
  }

  // Code 128 accepts alphanumeric characters without control codes
  if (/^[A-Za-z0-9\-_.]{3,32}$/.test(clean)) {
    return { isValid: true, format: 'CODE128' };
  }

  return { isValid: false, format: 'INVALID' };
}

/**
 * Generate a unique internal SKU and Code-128 compliant barcode for products without existing barcodes
 */
export function generateInternalBarcode(prefix: string = 'AFR'): {
  sku: string;
  barcode: string;
} {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  const code = `${prefix}-${timestamp}${randomPart}`;
  return {
    sku: code,
    barcode: code,
  };
}

/**
 * Format currency minor units to human readable string (e.g. 1500 pesewas -> "15.00")
 */
export function formatCurrency(
  minorUnits: number,
  currencyCode: string = 'GHS',
  showSymbol: boolean = true
): string {
  const major = (minorUnits / 100).toFixed(2);
  if (!showSymbol) return major;

  const symbolMap: Record<string, string> = {
    GHS: 'GH₵',
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦',
    KES: 'KSh',
  };

  const symbol = symbolMap[currencyCode] || `${currencyCode} `;
  return `${symbol}${major}`;
}
