import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  FileCheck,
  ShieldAlert,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Tenant,
  RegistrationApplication,
  SubscriptionPlan,
  AuditLog,
} from '../../types/database';
import { formatCurrency } from '../../lib/calculations';

interface SuperAdminDashboardProps {
  initialSubView?: string;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ initialSubView = 'overview' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialSubView);
  const [isLoading, setIsLoading] = useState(true);

  // Platform Data
  const [stats, setStats] = useState({
    totalSupermarkets: 0,
    pendingApplications: 0,
    approvedSupermarkets: 0,
    suspendedSupermarkets: 0,
    activeSubscriptions: 0,
    confirmedRevenueMinor: 0,
  });

  const [applications, setApplications] = useState<RegistrationApplication[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Application Review Modal
  const [selectedApp, setSelectedApp] = useState<RegistrationApplication | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // New Subscription Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price_major: '150.00',
    currency: 'GHS',
    billing_interval: 'monthly' as 'monthly' | 'yearly',
    max_products: 1500,
    max_cashiers: 5,
    trial_days: 14,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, appsData, tenantsData, plansData, logsData] = await Promise.all([
        api.getPlatformStats(),
        api.getRegistrationApplications(),
        api.getTenants(),
        api.getSubscriptionPlans(),
        api.getPlatformAuditLogs(),
      ]);

      setStats(statsData);
      setApplications(appsData);
      setTenants(tenantsData);
      setPlans(plansData);
      setAuditLogs(logsData);
    } catch (e) {
      console.error('Failed to load Super Admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !user) return;

    setIsSubmittingReview(true);
    try {
      await api.reviewApplication(selectedApp.id, reviewDecision, reviewNotes, user.id);
      setSelectedApp(null);
      setReviewNotes('');
      await loadData();
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    if (!user) return;
    const targetStatus = tenant.status === 'suspended' ? 'approved' : 'suspended';
    const confirmed = window.confirm(
      `Are you sure you want to mark "${tenant.name}" as ${targetStatus.toUpperCase()}?`
    );
    if (!confirmed) return;

    try {
      await api.updateTenantStatus(tenant.id, targetStatus, user.id);
      await loadData();
    } catch (err) {
      console.error('Failed to update tenant status:', err);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name) return;

    const priceMinor = Math.round(parseFloat(newPlan.price_major || '0') * 100);
    try {
      await api.createSubscriptionPlan({
        name: newPlan.name,
        description: newPlan.description,
        price_minor: priceMinor,
        currency: newPlan.currency,
        billing_interval: newPlan.billing_interval,
        max_products: newPlan.max_products,
        max_cashiers: newPlan.max_cashiers,
        trial_days: newPlan.trial_days,
        is_active: true,
      });
      setIsPlanModalOpen(false);
      setNewPlan({
        name: '',
        description: '',
        price_major: '150.00',
        currency: 'GHS',
        billing_interval: 'monthly',
        max_products: 1500,
        max_cashiers: 5,
        trial_days: 14,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create plan:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-[#E87512] uppercase tracking-wider">
            Platform Administration
          </span>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
            Super Admin Control Center
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Global multi-tenant governance, supermarket onboarding decisions, and recurring billing plans.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {/* Segmented Sub-view Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg max-w-2xl mb-8 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'applications', label: `Applications (${stats.pendingApplications})` },
          { id: 'tenants', label: `Supermarkets (${stats.totalSupermarkets})` },
          { id: 'plans', label: 'Subscription Plans' },
          { id: 'audit', label: 'Platform Audit Logs' },
          { id: 'settings', label: 'Settings & Integrations' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-VIEW 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Total Registered Supermarkets</span>
              <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
                {stats.totalSupermarkets}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-500">
                <span className="text-emerald-700 font-medium">{stats.approvedSupermarkets} active</span>
                <span>·</span>
                <span className="text-amber-700 font-medium">{stats.suspendedSupermarkets} suspended</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Pending Store Applications</span>
              <p className="text-2xl font-bold text-[#E87512] mt-2 tabular-nums">
                {stats.pendingApplications}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                Awaiting administrative review
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Active Subscriptions</span>
              <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
                {stats.activeSubscriptions}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                Enforced via payment provider
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">Confirmed Subscription Revenue</span>
              <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
                {formatCurrency(stats.confirmedRevenueMinor, 'GHS')}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                Derived from verified payment records
              </p>
            </div>
          </div>

          {/* Pending Applications Quick Action */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Recent Supermarket Registrations</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Decisions made here instantly provision or decline tenant accounts.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('applications')}
                className="text-xs font-semibold text-[#E87512] hover:underline"
              >
                View all ({applications.length})
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No registration applications submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="px-5 py-3">Supermarket</th>
                      <th className="px-5 py-3">Owner Contact</th>
                      <th className="px-5 py-3">Location & Currency</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {applications.slice(0, 5).map((app) => (
                      <tr key={app.id} className="hover:bg-neutral-50">
                        <td className="px-5 py-3 font-semibold text-neutral-900">{app.business_name}</td>
                        <td className="px-5 py-3 text-neutral-600">
                          <div>{app.owner_name}</div>
                          <div className="text-[11px] text-neutral-500">{app.owner_email}</div>
                        </td>
                        <td className="px-5 py-3 text-neutral-600">
                          {app.country} ({app.preferred_currency})
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`font-semibold text-[11px] ${
                              app.status === 'approved'
                                ? 'text-emerald-700'
                                : app.status === 'rejected'
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {app.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {app.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setReviewDecision('approved');
                              }}
                              className="px-3 py-1 bg-[#E87512] hover:bg-[#C96009] text-white font-semibold rounded text-[11px] transition-colors"
                            >
                              Review & Decide
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-400">Decided</span>
                          )}
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

      {/* SUB-VIEW 2: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-900">All Supermarket Applications</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Review and audit every supermarket registration attempt.
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              No supermarket applications found in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="px-5 py-3">Supermarket Name</th>
                    <th className="px-5 py-3">Owner Contact</th>
                    <th className="px-5 py-3">Address & Phone</th>
                    <th className="px-5 py-3">Currency</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Decision Notes</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 font-semibold text-neutral-900">{app.business_name}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-neutral-800">{app.owner_name}</div>
                        <div className="text-[11px] text-neutral-500">{app.owner_email}</div>
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        <div>{app.phone}</div>
                        <div className="text-[11px] text-neutral-500">{app.address}</div>
                      </td>
                      <td className="px-5 py-3 text-neutral-800 font-mono">{app.preferred_currency}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`font-semibold text-[11px] ${
                            app.status === 'approved'
                              ? 'text-emerald-700'
                              : app.status === 'rejected'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {app.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-500 text-[11px] max-w-[200px] truncate">
                        {app.decision_notes || '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {app.status === 'pending' ? (
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setReviewDecision('approved');
                            }}
                            className="px-3 py-1 bg-[#E87512] hover:bg-[#C96009] text-white font-semibold rounded text-[11px] transition-colors"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: SUPERMARKETS (TENANTS) */}
      {activeTab === 'tenants' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Provisioned Supermarket Tenants</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Independent retail tenants operating under PostgreSQL Row Level Security isolation.
              </p>
            </div>
          </div>

          {tenants.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              No supermarkets have been approved yet. Approve pending applications to provision tenants.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="px-5 py-3">Supermarket Name</th>
                    <th className="px-5 py-3">Slug / Tenant ID</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Currency</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Governance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 font-semibold text-neutral-900">{t.name}</td>
                      <td className="px-5 py-3 font-mono text-[11px] text-neutral-500">{t.slug}</td>
                      <td className="px-5 py-3 text-neutral-600">
                        <div>{t.email}</div>
                        <div className="text-[11px] text-neutral-500">{t.phone}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-neutral-800">{t.currency}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`font-semibold text-[11px] ${
                            t.status === 'approved' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleToggleTenantStatus(t)}
                          className={`px-3 py-1 font-semibold rounded text-[11px] transition-colors ${
                            t.status === 'suspended'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {t.status === 'suspended' ? 'Reinstate Tenant' : 'Suspend Tenant'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: SUBSCRIPTION PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Platform Subscription Plans</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Monthly pricing and usage limits configured for supermarket subscribers.
              </p>
            </div>
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Subscription Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.length === 0 ? (
              <div className="col-span-3 p-12 bg-white rounded-xl border border-neutral-200 text-center text-xs text-neutral-500">
                No subscription plans configured in database yet. Create your first plan above.
              </div>
            ) : (
              plans.map((p) => (
                <div key={p.id} className="bg-white p-6 rounded-xl border border-neutral-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#E87512] uppercase tracking-wider">
                      {p.billing_interval}
                    </span>
                    <h4 className="text-lg font-bold text-neutral-900 mt-1">{p.name}</h4>
                    <p className="text-xs text-neutral-500 mt-1">{p.description}</p>
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(p.price_minor, p.currency)}
                      </span>
                      <span className="text-xs text-neutral-500"> / {p.billing_interval}</span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Up to {p.max_products.toLocaleString()} registered products</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Up to {p.max_cashiers} cashier staff accounts</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{p.trial_days}-day complimentary onboarding trial</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Status</span>
                    <span className={`font-semibold ${p.is_active ? 'text-emerald-700' : 'text-neutral-400'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-900">Platform Audit Trail</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Immutable security record of administrative decisions, approvals, and tenant modifications.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              No audit log entries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Entity Type</th>
                    <th className="px-5 py-3">Entity ID</th>
                    <th className="px-5 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 text-neutral-500 font-sans">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-semibold text-neutral-900">{log.action}</td>
                      <td className="px-5 py-3 text-neutral-600">{log.entity_type}</td>
                      <td className="px-5 py-3 text-neutral-500 truncate max-w-[120px]">{log.entity_id || '—'}</td>
                      <td className="px-5 py-3 text-neutral-600 font-sans truncate max-w-[240px]">
                        {log.details_json ? JSON.stringify(log.details_json) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 6: SETTINGS & INTEGRATIONS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 space-y-6 max-w-3xl">
          <div>
            <h3 className="font-bold text-sm text-neutral-900">Platform Infrastructure Status</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Production configuration status for transactional email and recurring payment processing.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-lg border border-neutral-200 flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-xs text-neutral-900">Gmail SMTP Service</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Sends onboarding approvals, cashier invites, and billing notices via <code className="font-mono">smtp.gmail.com</code>.
                </p>
                <div className="mt-2 text-[11px] text-neutral-600">
                  Documentation: <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">docs/SMTP_GMAIL_SETUP.md</code>
                </div>
              </div>
              <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                Server-side Env
              </span>
            </div>

            <div className="p-4 rounded-lg border border-neutral-200 flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-xs text-neutral-900">Recurring Billing Provider</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Processes subscription collections and verified webhook receipts for tenant renewals.
                </p>
                <div className="mt-2 text-[11px] text-neutral-600">
                  Enforces webhook signature verification with idempotent event logging.
                </div>
              </div>
              <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                Configurable
              </span>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW APPLICATION MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-neutral-200">
            <div className="p-6 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-neutral-900">Review Supermarket Application</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Approving this application will immediately provision a new tenant in PostgreSQL with isolated RLS credentials.
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs space-y-1.5">
                <div><strong>Business:</strong> {selectedApp.business_name}</div>
                <div><strong>Owner:</strong> {selectedApp.owner_name} ({selectedApp.owner_email})</div>
                <div><strong>Address:</strong> {selectedApp.address}, {selectedApp.country}</div>
                <div><strong>Currency:</strong> {selectedApp.preferred_currency}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Administrative Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('approved')}
                    className={`py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                      reviewDecision === 'approved'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    Approve & Provision Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('rejected')}
                    className={`py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                      reviewDecision === 'rejected'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    Reject Application
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Decision Notes</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Valid business license verified. Store approved for onboarding."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] disabled:bg-neutral-300 text-white text-xs font-bold rounded shadow-xs"
                >
                  {isSubmittingReview ? 'Processing...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-neutral-200">
            <div className="p-6 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-neutral-900">Create Subscription Plan</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Define recurring billing rates and usage limits for supermarket subscribers.
              </p>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder="e.g. Supermarket Growth Tier"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Ideal for medium supermarkets with multiple cash registers"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPlan.price_major}
                    onChange={(e) => setNewPlan({ ...newPlan, price_major: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Currency</label>
                  <select
                    value={newPlan.currency}
                    onChange={(e) => setNewPlan({ ...newPlan, currency: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white"
                  >
                    <option value="GHS">GHS (GH₵)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Max Products</label>
                  <input
                    type="number"
                    value={newPlan.max_products}
                    onChange={(e) => setNewPlan({ ...newPlan, max_products: parseInt(e.target.value || '0', 10) })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Max Cashiers</label>
                  <input
                    type="number"
                    value={newPlan.max_cashiers}
                    onChange={(e) => setNewPlan({ ...newPlan, max_cashiers: parseInt(e.target.value || '0', 10) })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-bold rounded shadow-xs"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
