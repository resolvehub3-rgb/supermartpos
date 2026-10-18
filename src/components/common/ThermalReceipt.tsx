import React from 'react';
import { Printer, X, RotateCcw } from 'lucide-react';
import { Sale, StoreSettings, Tenant } from '../../types/database';
import { formatCurrency } from '../../lib/calculations';
import { BarcodeSvg } from './BarcodeSvg';

interface ThermalReceiptProps {
  sale: Sale;
  storeSettings?: StoreSettings | null;
  tenant?: Tenant | null;
  isReprint?: boolean;
  onClose?: () => void;
  showPrintButton?: boolean;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  sale,
  storeSettings,
  tenant,
  isReprint = false,
  onClose,
  showPrintButton = true,
}) => {
  const paperWidth = storeSettings?.receipt_paper_width_mm || 80;
  const currency = tenant?.currency || storeSettings?.currency || 'GHS';

  const handlePrint = () => {
    window.print();
  };

  const shopName = storeSettings?.trading_name || tenant?.name || 'SUPERMARKET';
  const address = tenant?.address || 'Retail Center';
  const phone = tenant?.phone || '';
  const dateFormatted = new Date(sale.created_at).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-neutral-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#E87512]" />
            <h3 className="font-semibold text-neutral-800 text-sm">
              {isReprint ? 'Receipt Reprint' : 'Sale Completed - Receipt'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {showPrintButton && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Receipt</span>
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Receipt Container */}
        <div className="p-6 overflow-y-auto max-h-[75vh] flex justify-center bg-neutral-100">
          <div
            id="thermal-receipt-print-area"
            style={{ width: paperWidth === 58 ? '54mm' : '76mm' }}
            className="bg-white p-4 shadow-sm border border-neutral-200 text-xs font-mono text-neutral-900 leading-tight"
          >
            {/* Header info */}
            <div className="text-center pb-3 border-b border-dashed border-neutral-400">
              {tenant?.logo_url && (
                <img
                  src={tenant.logo_url}
                  alt={shopName}
                  className="w-12 h-12 object-contain mx-auto mb-2"
                />
              )}
              <h2 className="font-bold text-sm tracking-wide uppercase">{shopName}</h2>
              <p className="text-[11px] text-neutral-600 mt-0.5">{address}</p>
              {phone && <p className="text-[11px] text-neutral-600">Tel: {phone}</p>}
              {tenant?.tax_id && (
                <p className="text-[10px] text-neutral-500 mt-0.5">TIN: {tenant.tax_id}</p>
              )}
            </div>

            {/* Reprint indicator */}
            {isReprint && (
              <div className="my-2 py-1 bg-amber-50 border border-amber-300 text-amber-800 font-bold text-center text-[10px] uppercase flex items-center justify-center gap-1">
                <RotateCcw className="w-3 h-3" />
                <span>*** REPRINT / DUPLICATE RECEIPT ***</span>
              </div>
            )}

            {/* Transaction metadata */}
            <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-500">Receipt No:</span>
                <span className="font-semibold">{sale.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date:</span>
                <span>{dateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Cashier:</span>
                <span>{sale.cashier?.full_name || 'Staff'}</span>
              </div>
              {sale.register_id && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Terminal:</span>
                  <span>REG-01</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="py-3 border-b border-dashed border-neutral-400">
              <div className="flex justify-between font-bold text-[10px] uppercase pb-1.5 text-neutral-700 border-b border-neutral-300 mb-1.5">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Total</span>
              </div>

              <div className="space-y-1.5">
                {(sale.items || []).map((item, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="font-medium truncate">{item.product_name}</div>
                    <div className="flex justify-between text-neutral-600 text-[10px] pl-1">
                      <span>
                        {item.quantity} x {formatCurrency(item.unit_price_minor, currency)}
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {formatCurrency(item.line_total_minor, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            <div className="py-3 border-b border-dashed border-neutral-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(sale.subtotal_minor, currency)}</span>
              </div>
              {sale.discount_minor > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(sale.discount_minor, currency)}</span>
                </div>
              )}
              {sale.tax_minor > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>{storeSettings?.tax_label || 'VAT'}</span>
                  <span className="tabular-nums">{formatCurrency(sale.tax_minor, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-neutral-300">
                <span>TOTAL DUE</span>
                <span className="tabular-nums font-bold text-sm">
                  {formatCurrency(sale.total_minor, currency)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="capitalize text-neutral-600">Paid ({sale.payment_method})</span>
                <span className="tabular-nums">{formatCurrency(sale.amount_tendered_minor, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Change Due</span>
                <span className="tabular-nums">{formatCurrency(sale.change_due_minor, currency)}</span>
              </div>
            </div>

            {/* Receipt Barcode for fast return lookup */}
            <div className="py-3 text-center border-b border-dashed border-neutral-400 flex flex-col items-center">
              <BarcodeSvg
                value={sale.receipt_number}
                format="CODE128"
                height={32}
                width={1.2}
                fontSize={10}
              />
              <span className="text-[9px] text-neutral-500 mt-0.5">Scan barcode for returns</span>
            </div>

            {/* Footer & Return policy */}
            <div className="pt-3 text-center text-[10px] text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-800">
                {storeSettings?.receipt_footer || 'Thank you for shopping with us!'}
              </p>
              <p className="leading-tight text-[9px]">
                {storeSettings?.receipt_return_policy || 'Goods returnable within 7 days with valid receipt.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
