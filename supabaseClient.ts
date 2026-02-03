import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Atenção: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
