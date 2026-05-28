import { createClient } from '@supabase/supabase-js';

// Vite in Electron exposes env variables via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in desktop-app.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
