import React from 'react';
import {
  Store,
  ArrowRight,
  Database,
  ScanBarcode,
  Package,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
  Sliders,
  Laptop,
  CheckCircle2,
  Users,
  CreditCard,
} from 'lucide-react';
import { PWAInstallButton } from '../../components/common/PWAInstallButton';

interface LandingViewProps {
  onNavigate: (view: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="py-20 px-6 border-b border-neutral-200 bg-linear-to-b from-[#FDF3E7]/40 via-neutral-50/50 to-white">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FDF3E7] border border-[#E87512]/30 rounded-full text-xs font-semibold text-[#E87512]">
            <Store className="w-3.5 h-3.5" />
            <span>Multi-Tenant Supermarket POS SaaS Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#242424] tracking-tight max-w-3xl mx-auto leading-tight">
            Enterprise Point of Sale for Modern Supermarkets
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Engineered with strict PostgreSQL multi-tenant isolation, real-time checkout, hardware barcode scanning, batched expiry control, and thermal receipt printing.
          </p>

          <div className="pt-4 flex flex-wrap justify-center items-center gap-3">
            <button
              onClick={() => onNavigate('register_shop')}
              className="px-6 py-3 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Register New Supermarket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="px-6 py-3 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Staff & Owner Sign In</span>
            </button>
            <PWAInstallButton variant="hero" />
          </div>
        </div>
      </section>

      {/* Role-Based Access: Three Dedicated System Interfaces */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-b border-neutral-200">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-300 rounded-full text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E87512]" />
            <span>Role-Based Access Control</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#242424] tracking-tight">
            Three Dedicated System Interfaces
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Every user experiences a purpose-built workspace with server-enforced permissions and strict tenant boundaries. A user cannot access unauthorized interfaces by altering client state.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Interface 1: Super Admin */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs hover:border-[#E87512]/50 transition-all flex flex-col">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-[#E87512]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-neutral-200 text-neutral-800 px-2.5 py-1 rounded-full">
                  Platform Admin
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-900">1. Super Admin Platform</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Centralized SaaS operations & governance for platform administrators.
              </p>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <ul className="space-y-2.5 text-xs text-neutral-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Supermarket Approvals:</strong> Review incoming store registration applications and execute KYC verification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Tenant Status Control:</strong> Instant status transitions (active, suspended, under review) with immediate RLS enforcement.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Subscription Plans:</strong> Manage tiered pricing, cashier limits, product caps, and billing cycles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Audit Logs:</strong> Immutable platform-wide event log recording approvals, role changes, and system activities.</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500">Role: super_admin</span>
                <button
                  onClick={() => onNavigate('login')}
                  className="text-xs font-bold text-[#E87512] hover:text-[#C96009] flex items-center gap-1 cursor-pointer"
                >
                  <span>Portal Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interface 2: Shop Owner Admin */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs hover:border-[#E87512]/50 transition-all flex flex-col">
            <div className="p-6 border-b border-neutral-100 bg-[#FDF3E7]/40">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#E87512] text-white flex items-center justify-center shadow-xs">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#FDF3E7] border border-[#E87512]/30 text-[#E87512] px-2.5 py-1 rounded-full">
                  Store Management
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-900">2. Shop Owner Admin Dashboard</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Full-spectrum supermarket management dashboard for owners and managers.
              </p>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <ul className="space-y-2.5 text-xs text-neutral-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E87512] shrink-0 mt-0.5" />
                  <span><strong>Inventory & Batches:</strong> Track stock levels, cost prices, selling margins, and batch expiry dates.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E87512] shrink-0 mt-0.5" />
                  <span><strong>Barcode Management:</strong> Generate compliant EAN-13, EAN-8, and Code 128 barcodes and print shelf labels.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E87512] shrink-0 mt-0.5" />
                  <span><strong>Shift Reconciliation:</strong> Review opening floats, counted closing cash, and automatic discrepancy calculations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E87512] shrink-0 mt-0.5" />
                  <span><strong>Sales & Thermal Receipts:</strong> Historical transactions, itemized audit trails, and 80mm/58mm receipt reprints.</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500">Role: owner / manager</span>
                <button
                  onClick={() => onNavigate('login')}
                  className="text-xs font-bold text-[#E87512] hover:text-[#C96009] flex items-center gap-1 cursor-pointer"
                >
                  <span>Owner Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interface 3: Cashier POS Terminal */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs hover:border-[#E87512]/50 transition-all flex flex-col">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <ScanBarcode className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full">
                  Checkout Lane
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-900">3. Cashier POS Terminal</h3>
              <p className="text-xs text-neutral-500 mt-1">
                High-speed checkout lane interface optimized for hardware barcode scanners.
              </p>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <ul className="space-y-2.5 text-xs text-neutral-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Hardware Barcode Wedge:</strong> Sub-second scanning via retail USB & Bluetooth handheld laser guns.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Expiry Protection:</strong> Automatic safety lock blocks scanned expired products from being sold.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Mandatory Shift Floats:</strong> Cashiers must declare starting float before checkout and end-of-day cash count.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Multi-Tender & Receipts:</strong> Tender in Cash, Card, or Mobile Money with exact change calculation and 80mm printing.</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500">Role: cashier</span>
                <button
                  onClick={() => onNavigate('login')}
                  className="text-xs font-bold text-[#E87512] hover:text-[#C96009] flex items-center gap-1 cursor-pointer"
                >
                  <span>Terminal Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop Installation Section */}
      <section className="py-16 px-6 bg-linear-to-b from-neutral-50 to-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-neutral-200 p-8 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FDF3E7] border border-[#E87512]/30 rounded-full text-xs font-bold text-[#E87512]">
                <Laptop className="w-3.5 h-3.5" />
                <span>Standalone Retail Application</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#242424] tracking-tight">
                Install Afrimart POS Directly on Desktop
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Transform checkout lanes and back-office management into focused, distraction-free desktop environments. Run standalone on Windows 10/11, macOS, and Linux with full keyboard wedge hardware support, instant thermal printing, and cached UI performance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-neutral-700">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    ✓
                  </div>
                  <span>No browser tabs or address bar distraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    ✓
                  </div>
                  <span>Instant barcode scanner gun focus</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    ✓
                  </div>
                  <span>Optimized for 80mm & 58mm thermal printers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    ✓
                  </div>
                  <span>Works with Chrome, Edge, Safari, and Brave</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E87512] flex items-center justify-center text-white shadow-md">
                <Laptop className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Desktop Terminal App</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">Compatible with Windows, macOS & Linux</p>
              </div>
              <div className="w-full">
                <PWAInstallButton variant="hero" className="w-full justify-center" />
              </div>
              <p className="text-[10px] text-neutral-400">
                Or click the install icon in your browser URL address bar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Retail Features */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h3 className="text-xl font-extrabold text-[#242424]">Enterprise Supermarket Operations</h3>
          <p className="text-xs text-neutral-500">Built for speed, accuracy, and rigorous inventory accountability.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800 mb-4">
              <ScanBarcode className="w-5 h-5 text-[#E87512]" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900">Hardware Barcode Scanning</h3>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Native keyboard wedge detection for retail USB/Bluetooth scanner guns with support for EAN-13, EAN-8, UPC-A, and Code 128 barcodes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800 mb-4">
              <Package className="w-5 h-5 text-[#E87512]" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900">Batch Expiry Control</h3>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Automatic expiry monitoring prevents expired items from checkout. Real-time low-stock alerts and auditable stock adjustments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800 mb-4">
              <Clock className="w-5 h-5 text-[#E87512]" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900">Shift & Cash Reconciliation</h3>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Mandatory shift opening floats and end-of-day cash count verification. Automatic calculation of overages and shortages.
            </p>
          </div>
        </div>
      </section>

      {/* Zero Mock Data Policy Banner */}
      <section className="py-12 px-6 bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-2 text-xs text-neutral-600">
              <h3 className="font-bold text-sm text-neutral-900">Strict Real Data Guarantee</h3>
              <p className="leading-relaxed">
                This SaaS platform contains <strong>zero fabricated sales, zero mock users, and zero placeholder numbers</strong>. All statistics, inventories, and cash shift balances are queried directly from authenticated Supabase PostgreSQL records under Row Level Security isolation.
              </p>
              <p className="text-[11px] text-neutral-500">
                To connect your database, execute the SQL migration script located in <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">supabase/migrations/</code> and configure your project keys in <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">.env</code>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
