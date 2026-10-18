import React, { useState } from 'react';
import { Store, User, Mail, Phone, MapPin, DollarSign, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

interface RegisterShopViewProps {
  onNavigate: (view: string) => void;
}

export const RegisterShopView: React.FC<RegisterShopViewProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    phone: '',
    address: '',
    country: 'Ghana',
    preferred_currency: 'GHS',
    terms_agreed: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.terms_agreed) {
      setErrorMessage('You must review and agree to the retail SaaS terms of service.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const app = await api.submitRegistrationApplication({
        business_name: formData.business_name,
        owner_name: formData.owner_name,
        owner_email: formData.owner_email,
        phone: formData.phone,
        address: formData.address,
        country: formData.country,
        preferred_currency: formData.preferred_currency,
      });

      setSubmittedAppId(app.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration submission failed';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-6 bg-neutral-50 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
        {submittedAppId ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              Application Submitted Successfully
            </h2>
            <div className="max-w-md mx-auto text-xs text-neutral-600 space-y-2 leading-relaxed">
              <p>
                Your registration for <strong className="text-neutral-900">{formData.business_name}</strong> has been securely recorded under Reference ID:
              </p>
              <div className="bg-neutral-100 p-2.5 rounded font-mono text-neutral-800 font-bold text-xs select-all">
                {submittedAppId}
              </div>
              <p>
                As an enterprise retail SaaS platform, every new supermarket application undergoes administrative review. Once approved by the Platform Administrator, an onboarding confirmation link will be delivered to <strong className="text-neutral-900">{formData.owner_email}</strong> to complete your store setup.
              </p>
            </div>
            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded transition-colors"
              >
                Back to Home
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-4 py-2 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded transition-colors"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="p-8 pb-6 border-b border-neutral-100">
              <span className="text-[11px] font-bold text-[#E87512] uppercase tracking-wider">
                Tenant Onboarding
              </span>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight mt-1">
                Register Your Supermarket
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Join the Afrimart multi-tenant retail POS network. Submit your business credentials for administrative review.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-5">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Supermarket / Business Name *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      placeholder="e.g. Accra City Supermarket"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Owner Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.owner_name}
                      onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      placeholder="e.g. Kwame Mensah"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Business Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.owner_email}
                      onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                      placeholder="owner@supermarket.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+233 24 000 0000"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Physical Store Address *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <textarea
                      required
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Plot 42 Commercial Avenue, Osu, Accra, Ghana"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none bg-white"
                  >
                    <option value="Ghana">Ghana</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Kenya">Kenya</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Preferred Currency</label>
                  <select
                    value={formData.preferred_currency}
                    onChange={(e) => setFormData({ ...formData, preferred_currency: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none bg-white"
                  >
                    <option value="GHS">Ghanaian Cedi (GH₵ - GHS)</option>
                    <option value="USD">US Dollar ($ - USD)</option>
                    <option value="EUR">Euro (€ - EUR)</option>
                    <option value="GBP">British Pound (£ - GBP)</option>
                    <option value="NGN">Nigerian Naira (₦ - NGN)</option>
                    <option value="KES">Kenyan Shilling (KSh - KES)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={formData.terms_agreed}
                    onChange={(e) => setFormData({ ...formData, terms_agreed: e.target.checked })}
                    className="mt-0.5 rounded border-neutral-300 text-[#E87512] focus:ring-[#E87512]"
                  />
                  <span>
                    I confirm that I am authorized to register this business and agree to the platform SaaS Terms of Service, data privacy policy, and tenant isolation agreements.
                  </span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-xs text-neutral-500 hover:text-neutral-800 font-medium"
                >
                  Already registered? Sign in
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-[#E87512] hover:bg-[#C96009] disabled:bg-neutral-300 text-white text-xs font-bold rounded transition-colors flex items-center gap-2 shadow-xs"
                >
                  {isLoading ? <span>Submitting Application...</span> : <span>Submit for Review</span>}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
