import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, Tenant, TenantMembership } from '../types/database';

export type UserRole = 'super_admin' | 'shop_owner' | 'cashier' | null;

interface AuthContextType {
  user: UserProfile | null;
  currentRole: UserRole;
  currentTenant: Tenant | null;
  membership: TenantMembership | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  signOut: () => Promise<void>;
  switchActiveTenant: (tenant: Tenant) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [membership, setMembership] = useState<TenantMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveRolesAndTenant = async (userId: string, email: string) => {
    if (!supabase) return;

    // 1. Check Super Admin role in platform_roles
    const { data: adminRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (adminRole) {
      setCurrentRole('super_admin');
      return;
    }

    // 2. Check tenant memberships
    const { data: memberData } = await supabase
      .from('tenant_memberships')
      .select('*, tenant:tenants(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (memberData && memberData.tenant) {
      setMembership(memberData);
      setCurrentTenant(memberData.tenant);
      if (memberData.role === 'owner' || memberData.role === 'manager') {
        setCurrentRole('shop_owner');
      } else {
        setCurrentRole('cashier');
      }
      return;
    }

    // Default to null role if no assignments found
    setCurrentRole(null);
  };

  const refreshSession = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const profile: UserProfile = {
          id: u.id,
          email: u.email || '',
          full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Staff Member',
          avatar_url: u.user_metadata?.avatar_url || null,
          created_at: u.created_at,
          updated_at: u.updated_at || u.created_at,
        };
        setUser(profile);
        await resolveRolesAndTenant(u.id, profile.email);
      } else {
        setUser(null);
        setCurrentRole(null);
        setCurrentTenant(null);
        setMembership(null);
      }
    } catch (e) {
      console.error('Session refresh error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const u = session.user;
          const profile: UserProfile = {
            id: u.id,
            email: u.email || '',
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Staff Member',
            avatar_url: u.user_metadata?.avatar_url || null,
            created_at: u.created_at,
            updated_at: u.updated_at || u.created_at,
          };
          setUser(profile);
          await resolveRolesAndTenant(u.id, profile.email);
        } else {
          setUser(null);
          setCurrentRole(null);
          setCurrentTenant(null);
          setMembership(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await resolveRolesAndTenant(data.user.id, data.user.email || '');
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setCurrentRole(null);
    setCurrentTenant(null);
    setMembership(null);
  };

  const switchActiveTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentRole,
        currentTenant,
        membership,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signOut,
        switchActiveTenant,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
