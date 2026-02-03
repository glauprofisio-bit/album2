import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bWNqYmpua2JsenZyanB2YWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MjI5NTYsImV4cCI6MjA4NTQ5ODk1Nn0.vVeaXTK7acdu9K_RqsE4CsHGPhNhUOWkcoz4Dgqm8z4';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Atenção: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
