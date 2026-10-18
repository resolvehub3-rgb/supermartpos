import React from 'react';
import { AlertCircle, Database, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

export const ConfigStatusBanner: React.FC = () => {
  if (isSupabaseConfigured) return null;

  return (
    <div className="bg-[#242424] text-white border-b border-neutral-700 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <Database className="w-4 h-4 text-[#E87512] shrink-0" />
          <span>
            <strong className="text-[#E87512]">Database Setup Required:</strong> Connect your Supabase project by providing <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">VITE_SUPABASE_URL</code> and <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">VITE_SUPABASE_ANON_KEY</code>.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-400">Zero mock data policy active</span>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[#E87512] hover:text-orange-400 transition-colors font-medium underline"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
