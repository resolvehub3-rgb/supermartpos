import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineTotal,
  calculateCartSummary,
  calculateChangeDue,
  calculateShiftReconciliation,
  evaluateExpiryStatus,
  validateEAN13,
  validateRetailBarcode,
  generateInternalBarcode,
  formatCurrency,
} from './calculations.ts';

test('calculateLineTotal handles standard item line multiplication', () => {
  const line = {
    productId: 'p1',
    name: 'Rice 5kg',
    unitPriceMinor: 4500, // 45.00 GHS
    quantity: 2,
  };
  assert.equal(calculateLineTotal(line), 9000);
});

test('calculateLineTotal applies percentage line discounts correctly', () => {
  const line = {
    productId: 'p2',
    name: 'Cooking Oil 1L',
    unitPriceMinor: 2000,
    quantity: 3,
    discountPercentage: 10, // 10% off
  };
  // 6000 * 0.9 = 5400
  assert.equal(calculateLineTotal(line), 5400);
});

test('calculateCartSummary computes exclusive tax correctly', () => {
  const items = [
    { productId: '1', name: 'Milk', unitPriceMinor: 1000, quantity: 2 }, // 2000
    { productId: '2', name: 'Bread', unitPriceMinor: 500, quantity: 1 }, // 500
  ];
  const summary = calculateCartSummary(items, {
    enabled: true,
    ratePercentage: 15,
    inclusive: false,
  });

  assert.equal(summary.subtotalMinor, 2500);
  assert.equal(summary.taxMinor, 375); // 15% of 2500 = 375
  assert.equal(summary.grandTotalMinor, 2875);
});

test('calculateCartSummary computes inclusive tax correctly', () => {
  const items = [
    { productId: '1', name: 'Pack', unitPriceMinor: 1150, quantity: 1 },
  ];
  const summary = calculateCartSummary(items, {
    enabled: true,
    ratePercentage: 15,
    inclusive: true,
  });

  // 1150 / 1.15 = 1000 base, 150 tax
  assert.equal(summary.taxMinor, 150);
  assert.equal(summary.taxableAmountMinor, 1000);
  assert.equal(summary.grandTotalMinor, 1150);
});

test('calculateChangeDue validates tender sufficiency and change', () => {
  const sufficient = calculateChangeDue(2450, 3000);
  assert.equal(sufficient.isValid, true);
  assert.equal(sufficient.changeDueMinor, 550);
  assert.equal(sufficient.shortageMinor, 0);

  const insufficient = calculateChangeDue(2450, 2000);
  assert.equal(insufficient.isValid, false);
  assert.equal(insufficient.changeDueMinor, 0);
  assert.equal(insufficient.shortageMinor, 450);
});

test('calculateShiftReconciliation calculates discrepancy and balance', () => {
  // Opening: 100.00 (10000), Sales: 500.00 (50000), Refunds: 20.00 (2000)
  // Expected: 580.00 (58000)
  const balanced = calculateShiftReconciliation(10000, 50000, 2000, 58000);
  assert.equal(balanced.expectedCashMinor, 58000);
  assert.equal(balanced.discrepancyMinor, 0);
  assert.equal(balanced.isBalanced, true);

  // Shortage case: Cashier counted 570.00 (57000) -> -10.00 shortage
  const shortage = calculateShiftReconciliation(10000, 50000, 2000, 57000);
  assert.equal(shortage.discrepancyMinor, -1000);
  assert.equal(shortage.isBalanced, false);
});

test('evaluateExpiryStatus flags expired, approaching expiry, and fresh dates', () => {
  const today = new Date('2026-10-18T00:00:00Z');

  // Past date
  const expired = evaluateExpiryStatus('2026-10-15', 30, today);
  assert.equal(expired.status, 'expired');
  assert.equal(expired.isSaleBlocked, true);

  // Expiring in 10 days
  const warning = evaluateExpiryStatus('2026-10-28', 30, today);
  assert.equal(warning.status, 'approaching_expiry');
  assert.equal(warning.isSaleBlocked, false);

  // Fresh, expiring next year
  const fresh = evaluateExpiryStatus('2027-10-18', 30, today);
  assert.equal(fresh.status, 'fresh');
  assert.equal(fresh.isSaleBlocked, false);
});

test('validateEAN13 calculates checksum accurately', () => {
  // Valid EAN-13 example: 4006381333931 (Stabilo Boss highlighter)
  assert.equal(validateEAN13('4006381333931'), true);
  // Invalid checksum (last digit flipped)
  assert.equal(validateEAN13('4006381333932'), false);
  // Invalid length
  assert.equal(validateEAN13('12345'), false);
});

test('validateRetailBarcode detects code formats', () => {
  assert.equal(validateRetailBarcode('4006381333931').format, 'EAN13');
  assert.equal(validateRetailBarcode('12345678').format, 'EAN8');
  assert.equal(validateRetailBarcode('012345678905').format, 'UPCA');
  assert.equal(validateRetailBarcode('AFR-SKU-0092').format, 'CODE128');
});

test('generateInternalBarcode returns valid Code-128 compliant identifier', () => {
  const result = generateInternalBarcode('MART');
  assert.ok(result.sku.startsWith('MART-'));
  assert.equal(validateRetailBarcode(result.barcode).format, 'CODE128');
});

test('formatCurrency formats major and minor units with symbols', () => {
  assert.equal(formatCurrency(1500, 'GHS'), 'GH₵15.00');
  assert.equal(formatCurrency(250, 'USD'), '$2.50');
  assert.equal(formatCurrency(0, 'EUR'), '€0.00');
});
