import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';

export const supabase = createClient(supabaseUrl, supabaseKey);
