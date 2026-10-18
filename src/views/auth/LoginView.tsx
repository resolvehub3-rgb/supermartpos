import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onNavigate: (view: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate }) => {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await signIn(email, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-neutral-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 border-b border-neutral-100 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#E87512] flex items-center justify-center text-white mx-auto mb-3 shadow-xs">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Staff & Management Sign In</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Access your authorized Supermarket POS, Owner Dashboard, or Platform Administration.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-4">
          {!isConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Supabase Configuration Notice</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-normal">
                Supabase credentials have not been configured yet in your environment. Refer to <code className="font-mono bg-white/60 px-1 py-0.5 rounded">docs/SUPABASE_SETUP.md</code> to connect your real database.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Staff Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@supermarket.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#E87512] hover:bg-[#C96009] disabled:bg-neutral-300 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-neutral-100 text-center space-y-2">
            <p className="text-xs text-neutral-500">
              New supermarket business?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register_shop')}
                className="font-semibold text-[#E87512] hover:underline"
              >
                Register your store
              </button>
            </p>
            <div className="text-[11px] text-neutral-400">
              Super Admin provisioned via manual bootstrap. See <code className="font-mono text-neutral-600">docs/SUPER_ADMIN_BOOTSTRAP.md</code>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
