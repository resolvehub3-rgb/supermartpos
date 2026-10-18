import React, { useState } from 'react';
import { Database, ShieldCheck, Mail, Server, Copy, Check } from 'lucide-react';

export const DocsView: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<'supabase' | 'superadmin' | 'smtp' | 'architecture'>('supabase');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <span className="text-xs font-bold text-[#E87512] uppercase tracking-wider">
          Developer & System Documentation
        </span>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
          Platform Setup & Operations Manual
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Complete instructions for Supabase schema execution, Super Admin provisioning, and Gmail SMTP integration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          {[
            { id: 'supabase', label: '1. Supabase & Schema Setup', icon: Database },
            { id: 'superadmin', label: '2. Super Admin Bootstrap', icon: ShieldCheck },
            { id: 'smtp', label: '3. Gmail SMTP Configuration', icon: Mail },
            { id: 'architecture', label: '4. System Architecture & RLS', icon: Server },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveDoc(item.id as any)}
                className={`w-full p-3 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                  activeDoc === item.id
                    ? 'bg-[#FDF3E7] text-[#E87512] border border-[#E87512]/30'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="lg:col-span-3 bg-white p-8 rounded-xl border border-neutral-200 text-xs text-neutral-700 space-y-4 leading-relaxed">
          {activeDoc === 'supabase' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-900">1. Supabase Database & Realtime Setup</h2>
              <p>
                Afrimart POS is built exclusively on real Supabase PostgreSQL tables, Auth, and Storage.
              </p>
              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-2">
                <p className="font-semibold text-neutral-900">Steps to Execute:</p>
                <ol className="list-decimal pl-5 space-y-1 text-neutral-600">
                  <li>Open your project at <strong>https://supabase.com/dashboard</strong>.</li>
                  <li>Go to <strong>SQL Editor</strong> and open file <code className="font-mono bg-white px-1 py-0.5 rounded">supabase/migrations/20261018000001_initial_supermarket_pos_schema.sql</code>.</li>
                  <li>Execute the script to create all 21 tables, foreign key constraints, indexes, and Row Level Security policies.</li>
                  <li>Under <strong>Storage</strong>, create public bucket <code className="font-mono bg-white px-1 py-0.5 rounded">product-images</code>.</li>
                  <li>Under <strong>Database → Replication</strong>, enable Realtime for <code className="font-mono bg-white px-1 py-0.5 rounded">sales</code> and <code className="font-mono bg-white px-1 py-0.5 rounded">cashier_shifts</code>.</li>
                </ol>
              </div>
            </div>
          )}

          {activeDoc === 'superadmin' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-900">2. Super Admin Bootstrap Procedure</h2>
              <p>
                To prevent privilege escalation, Super Admin accounts cannot be created via public sign-up. Execute this secure script in your Supabase SQL editor:
              </p>
              <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-[11px] overflow-x-auto select-all">
{`-- Replace with your Supabase Auth User ID
INSERT INTO public.platform_roles (user_id, role)
VALUES ('YOUR-SUPABASE-AUTH-USER-UUID', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;`}
              </pre>
            </div>
          )}

          {activeDoc === 'smtp' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-900">3. Gmail SMTP Configuration</h2>
              <p>
                Configure server-side environment variables for transactional notifications:
              </p>
              <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-[11px] overflow-x-auto select-all">
{`SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="notifications@yourdomain.com"
SMTP_PASSWORD="your-16-char-app-password"
SMTP_FROM_EMAIL="notifications@yourdomain.com"
SMTP_FROM_NAME="Afrimart POS Cloud"`}
              </pre>
            </div>
          )}

          {activeDoc === 'architecture' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-900">4. Multi-Tenant Architecture & Security</h2>
              <p>
                Every supermarket operates as an independent tenant identified by an immutable UUID <code className="font-mono">tenant_id</code>. PostgreSQL Row Level Security (RLS) policies reject any cross-tenant read or mutation attempts, ensuring strict commercial data isolation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
