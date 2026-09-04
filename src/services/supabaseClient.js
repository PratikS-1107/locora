import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-supabase.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Single shared Supabase client singleton across the application to prevent multiple GoTrueClient instances
const globalScope = typeof window !== 'undefined' ? window : globalThis;

if (!globalScope.__locora_supabase__) {
  globalScope.__locora_supabase__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'locora-auth-token'
    }
  });
}

export const supabase = globalScope.__locora_supabase__;

export const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-supabase-project-url.supabase.co' &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder-supabase.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-anon-key'
  );
};
