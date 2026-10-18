import React from 'react';
import { ShoppingBag, LogOut, User, Store, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, currentRole, currentTenant, signOut } = useAuth();

  const getNavLinks = () => {
    if (currentRole === 'super_admin') {
      return [
        { id: 'super_admin_overview', label: 'Overview' },
        { id: 'super_admin_applications', label: 'Applications' },
        { id: 'super_admin_tenants', label: 'Supermarkets' },
        { id: 'super_admin_plans', label: 'Subscription Plans' },
        { id: 'super_admin_audit', label: 'Audit Logs' },
      ];
    }

    if (currentRole === 'shop_owner') {
      return [
        { id: 'shop_overview', label: 'Dashboard' },
        { id: 'shop_products', label: 'Inventory & Products' },
        { id: 'shop_barcodes', label: 'Barcodes' },
        { id: 'shop_sales', label: 'Sales & Receipts' },
        { id: 'shop_shifts', label: 'Shifts' },
      ];
    }

    if (currentRole === 'cashier') {
      return [
        { id: 'cashier_pos', label: 'Terminal POS' },
        { id: 'cashier_shifts', label: 'My Shift' },
        { id: 'cashier_history', label: 'Recent Sales' },
      ];
    }

    // Public / Unauthenticated
    return [
      { id: 'landing', label: 'Home' },
      { id: 'register_shop', label: 'Register Supermarket' },
      { id: 'docs', label: 'Documentation' },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <button
          onClick={() => onNavigate(user ? (currentRole === 'super_admin' ? 'super_admin_overview' : currentRole === 'cashier' ? 'cashier_pos' : 'shop_overview') : 'landing')}
          className="flex items-center gap-2 text-left group shrink-0"
        >
          <div className="w-8 h-8 rounded bg-[#E87512] flex items-center justify-center text-white font-bold text-base shadow-xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#242424] whitespace-nowrap">
            Afrimart POS
          </span>
        </button>

        {/* Zone 2: 4-5 single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-neutral-600">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`hover:text-[#E87512] transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentView === link.id
                  ? 'text-[#E87512] border-b-2 border-[#E87512]'
                  : 'text-neutral-600'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Actions & Desktop Install */}
        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton variant="header" />
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-neutral-800 leading-none truncate max-w-[120px]">
                  {user.full_name}
                </p>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
                  {currentRole === 'super_admin' ? 'Super Admin' : currentTenant?.name || currentRole}
                </span>
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#E87512] hover:bg-[#C96009] rounded transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              Staff Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
