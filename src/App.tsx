import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { ConfigStatusBanner } from './components/common/ConfigStatusBanner';
import { LandingView } from './views/landing/LandingView';
import { LoginView } from './views/auth/LoginView';
import { RegisterShopView } from './views/auth/RegisterShopView';
import { SetupWizardView } from './views/setup/SetupWizardView';
import { SuperAdminDashboard } from './views/superadmin/SuperAdminDashboard';
import { ShopOwnerDashboard } from './views/shop/ShopOwnerDashboard';
import { CashierPosView } from './views/cashier/CashierPosView';
import { DocsView } from './views/docs/DocsView';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, currentRole, currentTenant, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('landing');
  const [isOnboardingNeeded, setIsOnboardingNeeded] = useState<boolean>(false);

  // Check if store owner has completed onboarding wizard
  useEffect(() => {
    if (currentRole === 'shop_owner' && currentTenant) {
      api.getStoreSettings(currentTenant.id).then((settings) => {
        if (!settings || !settings.onboarding_completed) {
          setIsOnboardingNeeded(true);
        } else {
          setIsOnboardingNeeded(false);
        }
      });
    }
  }, [currentRole, currentTenant]);

  // Automatic routing based on resolved role upon authentication
  useEffect(() => {
    if (user && currentRole) {
      if (currentRole === 'super_admin' && (currentView === 'landing' || currentView === 'login')) {
        setCurrentView('super_admin_overview');
      } else if (currentRole === 'shop_owner' && (currentView === 'landing' || currentView === 'login')) {
        setCurrentView(isOnboardingNeeded ? 'setup' : 'shop_overview');
      } else if (currentRole === 'cashier' && (currentView === 'landing' || currentView === 'login')) {
        setCurrentView('cashier_pos');
      }
    } else if (!user && !['landing', 'login', 'register_shop', 'docs'].includes(currentView)) {
      setCurrentView('login');
    }
  }, [user, currentRole, isOnboardingNeeded]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#E87512] border-t-transparent animate-spin" />
          <span>Initializing Afrimart Supermarket POS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#242424] flex flex-col font-sans">
      <ConfigStatusBanner />
      <Header currentView={currentView} onNavigate={(view) => setCurrentView(view)} />

      <main className="flex-1">
        {/* Public Views */}
        {currentView === 'landing' && <LandingView onNavigate={(view) => setCurrentView(view)} />}
        {currentView === 'login' && <LoginView onNavigate={(view) => setCurrentView(view)} />}
        {currentView === 'register_shop' && <RegisterShopView onNavigate={(view) => setCurrentView(view)} />}
        {currentView === 'docs' && <DocsView />}

        {/* Guided Setup Wizard */}
        {currentView === 'setup' && (
          <SetupWizardView onComplete={() => {
            setIsOnboardingNeeded(false);
            setCurrentView('shop_overview');
          }} />
        )}

        {/* Super Admin Portal */}
        {currentView.startsWith('super_admin') && (
          <SuperAdminDashboard
            initialSubView={
              currentView === 'super_admin_applications'
                ? 'applications'
                : currentView === 'super_admin_tenants'
                ? 'tenants'
                : currentView === 'super_admin_plans'
                ? 'plans'
                : currentView === 'super_admin_audit'
                ? 'audit'
                : 'overview'
            }
          />
        )}

        {/* Shop Owner Admin Dashboard */}
        {currentView.startsWith('shop') && (
          <ShopOwnerDashboard
            initialTab={
              currentView === 'shop_products'
                ? 'products'
                : currentView === 'shop_barcodes'
                ? 'barcodes'
                : currentView === 'shop_sales'
                ? 'sales'
                : currentView === 'shop_shifts'
                ? 'shifts'
                : 'overview'
            }
          />
        )}

        {/* Cashier Terminal Interface */}
        {currentView.startsWith('cashier') && (
          <CashierPosView />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
