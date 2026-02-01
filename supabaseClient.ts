import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bumcjbjnkblzvrjpvafn.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_8jjRyS4uqL9yLU6JdpHx9A_l-UgLSYW'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
